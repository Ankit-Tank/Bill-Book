from datetime import datetime, timezone
from flask import Blueprint, jsonify
from ..db import check_db_health

health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
@health_bp.route("/api/v1/health", methods=["GET"])
def get_health():
    """Health check endpoint accessible without API key."""
    is_db_ok = check_db_health()
    status = "healthy" if is_db_ok else "unhealthy"
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    payload = {
        "status": status,
        "version": "1.0.0",
        "timestamp": now_iso,
    }
    status_code = 200 if is_db_ok else 503
    return jsonify(payload), status_code
