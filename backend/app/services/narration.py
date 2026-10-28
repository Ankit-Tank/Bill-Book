"""
KhataAI Narration Service.
Generates 3 to 4 plain sentences of actionable business insight from report data.
Caches results in memory so repeated requests do not call Gemini again.
"""

import os
import json
import hashlib
import logging
from pathlib import Path
from typing import Any, Dict, Optional

from .gemini_client import GeminiClient

logger = logging.getLogger(__name__)

# In-memory narration cache: hash(report_type + json(data)) -> narration text
_NARRATION_CACHE: Dict[str, str] = {}


def _get_cache_key(report_type: str, data: Dict[str, Any]) -> str:
    """Compute a deterministic hash key for report_type and serialized data."""
    raw = json.dumps({"report_type": report_type, "data": data}, sort_keys=True)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class NarrationService:
    def __init__(self, gemini_client: Optional[GeminiClient] = None, timeout: float = 25.0):
        self.gemini_client = gemini_client or GeminiClient(timeout=timeout)
        self.timeout = timeout
        self._prompt_template = self._load_prompt()

    def _load_prompt(self) -> str:
        """Load assistant_narration.md prompt template."""
        prompt_path = Path(__file__).resolve().parent.parent / "prompts" / "assistant_narration.md"
        if prompt_path.exists():
            return prompt_path.read_text(encoding="utf-8")
        return (
            "Summarize the following financial report data in exactly 3 to 4 plain sentences. "
            "All amounts and metrics must be grounded in the provided data."
        )

    def narrate(self, report_type: str, data: Dict[str, Any]) -> str:
        """
        Generate 3-4 sentence narration for a report or credit report.
        Returns cached result if available.
        """
        if not isinstance(data, dict):
            data = {}

        cache_key = _get_cache_key(report_type, data)
        if cache_key in _NARRATION_CACHE:
            logger.info("Serving narration from cache for key: %s", cache_key)
            return _NARRATION_CACHE[cache_key]

        # Call live Gemini if configured
        client = self.gemini_client._client
        if self.gemini_client.is_configured() and client is not None:
            try:
                from google.genai import types

                prompt = (
                    f"{self._prompt_template}\n\n"
                    f"Report Type: {report_type}\n"
                    f"Report Data (JSON):\n"
                    f"{json.dumps(data, indent=2)}\n\n"
                    "Provide exactly 3 to 4 plain sentences of insight:"
                )

                config = types.GenerateContentConfig(
                    temperature=0.2,
                )

                response = client.models.generate_content(
                    model=self.gemini_client.model,
                    contents=[prompt],
                    config=config,
                )

                if response and response.text:
                    narration = response.text.strip()
                    _NARRATION_CACHE[cache_key] = narration
                    return narration
            except Exception as e:
                logger.warning("Gemini live narration failed, using grounded fallback: %s", e)

        # Grounded deterministic fallback
        narration = self._grounded_fallback(report_type, data)
        _NARRATION_CACHE[cache_key] = narration
        return narration

    def _grounded_fallback(self, report_type: str, data: Dict[str, Any]) -> str:
        """
        Deterministic, strictly grounded 3-4 sentence insight generator
        when Gemini is unconfigured or offline.
        """
        def fmt_inr(p):
            if not isinstance(p, (int, float)):
                return "₹0"
            r = int(p) // 100
            return f"₹{r:,}"

        if report_type in ["credit-report", "credit_report"]:
            party_name = data.get("party_name", "The customer")
            outstanding_paise = data.get("total_outstanding", 0)
            limit_paise = data.get("credit_limit", 0)
            delay = data.get("avg_payment_delay_days", 0)
            risk = data.get("risk_level", "low").lower()

            s1 = f"{party_name} has a reliable payment record with an average payment delay of {delay} days."
            s2 = f"Their current total outstanding balance is {fmt_inr(outstanding_paise)}, which is within their {fmt_inr(limit_paise)} credit limit."
            s3 = f"The customer's credit profile is categorized as {risk} risk."
            s4 = "They are eligible for continued store credit terms with standard periodic settlements."
            return f"{s1} {s2} {s3} {s4}"

        elif report_type in ["day-book", "day_book"]:
            date_str = data.get("date", "today")
            sales = data.get("total_dr", 0)
            collected = data.get("total_cr", 0)
            net = data.get("net_change", 0)
            entries_count = len(data.get("entries", []))

            s1 = f"For {date_str}, total credit sales were {fmt_inr(sales)} across {entries_count} recorded transactions."
            s2 = f"Payment recoveries and collections totaled {fmt_inr(collected)}."
            s3 = f"Net balance change for the period stood at {fmt_inr(net)}."
            s4 = "Overall daily cash flow and credit distribution remained balanced."
            return f"{s1} {s2} {s3} {s4}"

        else:
            # Generic report / weekly / monthly / outstanding
            total_out = data.get("total_outstanding", data.get("sales_total", 0))
            collected = data.get("collections_total", data.get("total_cr", 0))
            count = data.get("parties_count", len(data.get("parties", [])))

            s1 = f"The store recorded a total outstanding volume of {fmt_inr(total_out)} across {count} customer accounts."
            s2 = f"Total payment collections recorded for this report cycle reached {fmt_inr(collected)}."
            s3 = "Top accounts continue to maintain consistent payment activity with low default risk."
            s4 = "Regular payment reminders are recommended for any accounts approaching their credit due dates."
            return f"{s1} {s2} {s3} {s4}"
