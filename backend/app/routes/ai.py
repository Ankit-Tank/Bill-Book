import os
from flask import Blueprint, request, jsonify, Flask
from flask_cors import CORS
from ..services.extraction import ExtractionService

ai_bp = Blueprint("ai", __name__)
extraction_service = ExtractionService()


@ai_bp.route("/ai/extract", methods=["POST"])
def extract_media():
    """
    POST /api/v1/ai/extract
    Extract structured transaction data from bill photos or Hindi/Hinglish voice notes.
    Accepts multipart/form-data with 'file' and optional 'media_type' ('image' | 'audio').
    """
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
