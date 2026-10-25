"""Alerts management routes.

Provides:
- GET /api/v1/alerts (?unread_only=true|false)
- POST /api/v1/alerts/:id/read
- POST /api/v1/alerts/run
"""

import uuid
from flask import Blueprint, request, jsonify
from ..services.alerts import list_alerts, mark_alert_read, evaluate_all_alerts

alerts_bp = Blueprint("alerts", __name__)


def validate_uuid(id_str: str) -> str:
    """Validate UUID format or raise 404 standard error."""
    try:
        return str(uuid.UUID(id_str))
    except (ValueError, TypeError, AttributeError):
        from .. import APIError
        raise APIError("ALERT_NOT_FOUND", f"Alert with ID {id_str} was not found.", 404)


@alerts_bp.route("/alerts", methods=["GET"])
def get_alerts():
    """List business alerts with optional unread filtering."""
    unread_only = request.args.get("unread_only", "").strip().lower() in ("true", "1", "yes")
    result = list_alerts(unread_only=unread_only)
    return jsonify(result), 200


@alerts_bp.route("/alerts/<alert_id>/read", methods=["POST"])
def read_alert(alert_id: str):
    """Mark a single alert as read."""
    clean_id = validate_uuid(alert_id)
    result = mark_alert_read(clean_id)
    return jsonify(result), 200


@alerts_bp.route("/alerts/run", methods=["POST"])
def run_alerts():
    """Trigger manual system-wide evaluation of all alert rules."""
    result = evaluate_all_alerts()
    return jsonify(result), 200
