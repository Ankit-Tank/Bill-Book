import os
import re
import json
import logging
import subprocess
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field, ValidationError

from .gemini_client import GeminiClient
from .party_match import match_party
from ..prompts import BILL_EXTRACTION_PROMPT, VOICE_EXTRACTION_PROMPT

logger = logging.getLogger(__name__)

# Maximum file upload limit: 15 MB
MAX_UPLOAD_BYTES = 15 * 1024 * 1024

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".heic"}
AUDIO_EXTENSIONS = {".m4a", ".mp3", ".wav", ".aac", ".ogg", ".flac"}

MIME_TYPE_MAP = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".heic": "image/heic",
    ".m4a": "audio/mp4",  # Gemini accepts AAC audio inside MP4 container
    ".mp3": "audio/mp3",
    ".wav": "audio/wav",
    ".aac": "audio/aac",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
}


class ExtractedItem(BaseModel):
    name: str = ""
    quantity: float = 1.0
    rate: int = 0
    amount: int = 0


class PartyCandidate(BaseModel):
    id: str
    name: str
    phone: Optional[str] = None
    score: float


class ExtractionResult(BaseModel):
    party_name: str = ""
    party_candidates: List[PartyCandidate] = []
    kind: Literal["DR", "CR"] = "DR"
    amount: int = 0  # in paise
    txn_date: str = ""  # YYYY-MM-DD or ""
    particulars: str = ""
    items: List[ExtractedItem] = []
    confidence: float = 0.0
    needs_review_fields: List[str] = []


def is_ffmpeg_available() -> bool:
    """Check if ffmpeg executable is installed and available in PATH."""
    try:
        res = subprocess.run(["ffmpeg", "-version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return res.returncode == 0
    except Exception:
        return False


def convert_m4a_to_wav(m4a_bytes: bytes) -> Optional[bytes]:
    """Convert m4a audio stream to 16kHz mono WAV using ffmpeg if installed."""
    if not is_ffmpeg_available():
        return None
    try:
        proc = subprocess.Popen(
            ["ffmpeg", "-i", "pipe:0", "-f", "wav", "-ar", "16000", "-ac", "1", "pipe:1"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        stdout, _ = proc.communicate(input=m4a_bytes, timeout=10)
        if proc.returncode == 0 and stdout:
            return stdout
    except Exception as e:
        logger.warning(f"ffmpeg conversion failed: {e}")
    return None


def clean_json_text(raw_text: str) -> str:
    """Strip markdown code fence blocks if returned by LLM."""
    text = raw_text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


class ExtractionService:
    def __init__(self, gemini_client: Optional[GeminiClient] = None):
        self.client = gemini_client or GeminiClient()

    def extract_from_file(
        self,
        file_bytes: bytes,
        filename: str,
        media_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Extract structured transaction data from uploaded bill image or voice note.
        """
        if not file_bytes:
            raise ValueError("Uploaded file is empty.")

        if len(file_bytes) > MAX_UPLOAD_BYTES:
            raise ValueError(f"File size exceeds maximum allowed limit of {MAX_UPLOAD_BYTES // (1024*1024)}MB.")

        # Determine file extension and MIME type
        _, ext = os.path.splitext(filename.lower())
        if not ext and media_type:
            ext = ".jpg" if media_type == "image" else ".m4a"

        mime_type = MIME_TYPE_MAP.get(ext)
        if not mime_type:
            if ext in IMAGE_EXTENSIONS:
                mime_type = "image/jpeg"
            elif ext in AUDIO_EXTENSIONS:
                mime_type = "audio/mp4"
            else:
                raise ValueError(f"Unsupported file extension: '{ext}'. Supported: {sorted(IMAGE_EXTENSIONS | AUDIO_EXTENSIONS)}")

        # Validate media type category
        is_audio = ext in AUDIO_EXTENSIONS or media_type == "audio"
        is_image = ext in IMAGE_EXTENSIONS or media_type == "image"

        if not (is_audio or is_image):
            raise ValueError("Invalid media_type. Must be 'image' or 'audio'.")

        prompt = VOICE_EXTRACTION_PROMPT if is_audio else BILL_EXTRACTION_PROMPT

        # Audio conversion check for Expo .m4a format
        processed_bytes = file_bytes
        if is_audio and ext == ".m4a":
            # If ffmpeg is available, convert to standard WAV; otherwise send audio/mp4 directly
            converted = convert_m4a_to_wav(file_bytes)
            if converted:
                processed_bytes = converted
                mime_type = "audio/wav"
            else:
                mime_type = "audio/mp4"

        # Call Gemini SDK via wrapper
        raw_output = self.client.generate_content(
            prompt=prompt,
            media_bytes=processed_bytes,
            mime_type=mime_type,
        )

        # Parse JSON output
        cleaned_json = clean_json_text(raw_output)
        try:
            parsed_dict = json.loads(cleaned_json)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from Gemini output: {raw_output}")
            raise ValueError(f"Gemini output could not be parsed as JSON: {e}")

        # Post-process fields and ensure money rules
        party_name = parsed_dict.get("party_name", "").strip()
        kind = parsed_dict.get("kind", "DR").upper()
        if kind not in ["DR", "CR"]:
            kind = "DR"

        amount = int(parsed_dict.get("amount", 0))

        # Check if amount was returned in rupees rather than paise (sanity check)
        # In case LLM extracted e.g. 2500 instead of 250000 paise when items say 2500
        items_data = parsed_dict.get("items", [])
        if amount > 0 and amount < 50000 and items_data:
            items_sum = sum(int(it.get("amount", 0)) for it in items_data)
            if items_sum > amount * 10:
                amount = items_sum

        txn_date = parsed_dict.get("txn_date", "").strip()
        # Validate date format YYYY-MM-DD
        if txn_date and not re.match(r"^\d{4}-\d{2}-\d{2}$", txn_date):
            txn_date = ""

        particulars = parsed_dict.get("particulars", "").strip()
        if not particulars:
            particulars = "Bill payment" if kind == "CR" else "Credit sale"

        confidence = float(parsed_dict.get("confidence", 0.85))
        needs_review = list(parsed_dict.get("needs_review_fields", []))

        # Fuzzy match party name against parties list
        party_candidates = match_party(party_name)

        # Review field heuristics
        if not txn_date and "txn_date" not in needs_review:
            needs_review.append("txn_date")

        if amount <= 0 and "amount" not in needs_review:
            needs_review.append("amount")

        if not party_candidates or (party_candidates and party_candidates[0]["score"] < 0.65):
            if "party_name" not in needs_review:
                needs_review.append("party_name")

        # Clean items list
        formatted_items = []
        for it in items_data:
            formatted_items.append({
                "name": it.get("name", ""),
                "quantity": float(it.get("quantity", 1.0)),
                "rate": int(it.get("rate", 0)),
                "amount": int(it.get("amount", 0)),
            })

        result = ExtractionResult(
            party_name=party_name,
            party_candidates=party_candidates,
            kind=kind,
            amount=amount,
            txn_date=txn_date,
            particulars=particulars,
            items=formatted_items,
            confidence=round(confidence, 2),
            needs_review_fields=sorted(list(set(needs_review))),
        )
        return result.model_dump()
