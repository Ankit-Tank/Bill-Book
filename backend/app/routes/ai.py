import os
import time
from collections import defaultdict
from flask import Blueprint, request, jsonify, Flask
from flask_cors import CORS
from ..services.extraction import ExtractionService

ai_bp = Blueprint("ai", __name__)
extraction_service = ExtractionService()

# In-memory sliding window rate limiter (30 req / min per IP)
_ai_request_log = defaultdict(list)
AI_RATE_LIMIT_WINDOW_SECONDS = 60
AI_RATE_LIMIT_MAX_REQUESTS = 30
MAX_EXTRACTION_FILE_BYTES = 10 * 1024 * 1024  # 10MB


def reset_rate_limits():
    """Helper to reset rate limit records during automated test runs."""
    _ai_request_log.clear()


@ai_bp.route("/ai/extract", methods=["POST"])
def extract_media():
    """
    POST /api/v1/ai/extract
    Extract structured transaction data from bill photos or Hindi/Hinglish voice notes.
    Accepts multipart/form-data with 'file' and optional 'media_type' ('image' | 'audio').
    Protected by rate limiting (30 requests/minute) and payload size limit (10MB).
    """
    # 1. Rate limiting check
    client_ip = request.remote_addr or "127.0.0.1"
    now = time.time()
    # Prune timestamps older than window
    _ai_request_log[client_ip] = [t for t in _ai_request_log[client_ip] if now - t < AI_RATE_LIMIT_WINDOW_SECONDS]
    if len(_ai_request_log[client_ip]) >= AI_RATE_LIMIT_MAX_REQUESTS:
        return jsonify({
            "error": {
                "code": "RATE_LIMIT_EXCEEDED",
                "message": "Rate limit exceeded for AI extraction (maximum 30 requests per minute). Please try again later."
            }
        }), 429

    # 2. Check content-length header
    if request.content_length and request.content_length > 16 * 1024 * 1024:
        return jsonify({
            "error": {
                "code": "PAYLOAD_TOO_LARGE",
                "message": "Payload exceeds maximum allowed size of 16MB."
            }
        }), 413

    if "file" not in request.files:
        return jsonify({
            "error": {
                "code": "INVALID_INPUT",
                "message": "Missing required file field 'file' in multipart/form-data request."
            }
        }), 400

    uploaded_file = request.files["file"]
    if not uploaded_file.filename or uploaded_file.filename.strip() == "":
        return jsonify({
            "error": {
                "code": "INVALID_INPUT",
                "message": "Uploaded file must have a valid filename."
            }
        }), 400

    media_type = request.form.get("media_type")
    file_bytes = uploaded_file.read()

    # 3. Check file byte size
    if len(file_bytes) > MAX_EXTRACTION_FILE_BYTES:
        return jsonify({
            "error": {
                "code": "PAYLOAD_TOO_LARGE",
                "message": f"Uploaded file size ({len(file_bytes)} bytes) exceeds maximum limit of 10MB."
            }
        }), 413

    # Record rate limit request timestamp
    _ai_request_log[client_ip].append(now)

    try:
        result = extraction_service.extract_from_file(
            file_bytes=file_bytes,
            filename=uploaded_file.filename,
            media_type=media_type,
        )
        return jsonify(result), 200

    except ValueError as ve:
        err_msg = str(ve)
        err_code = "INVALID_INPUT" if ("unsupported" in err_msg.lower() or "empty" in err_msg.lower() or "size exceeds" in err_msg.lower()) else "EXTRACTION_FAILED"
        status_code = 400 if err_code == "INVALID_INPUT" else 422
        return jsonify({
            "error": {
                "code": err_code,
                "message": err_msg,
            }
        }), status_code
    except Exception as e:
        return jsonify({
            "error": {
                "code": "EXTRACTION_FAILED",
                "message": f"Media extraction failed: {str(e)}"
            }
        }), 422


def create_ai_app() -> Flask:
    """Helper factory for standalone AI testing and dev server."""
    app = Flask(__name__)
    CORS(app)
    app.register_blueprint(ai_bp, url_prefix="/api/v1")
    return app
