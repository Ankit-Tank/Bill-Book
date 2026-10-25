"""Credit management routes.

Provides:
- GET /api/v1/parties/:id/credit-report
"""

import uuid
from flask import Blueprint, jsonify
from ..services.credit import get_credit_report

credit_bp = Blueprint("credit", __name__)


def validate_uuid(id_str: str) -> str:
    """Validate UUID format or raise 404 standard error."""
    try:
        return str(uuid.UUID(id_str))
    except (ValueError, TypeError, AttributeError):
        from .. import APIError
        raise APIError("PARTY_NOT_FOUND", f"Party with ID {id_str} was not found.", 404)


@credit_bp.route("/parties/<party_id>/credit-report", methods=["GET"])
def get_party_credit_report(party_id: str):
    """Retrieve detailed credit risk report for a specific party."""
    clean_id = validate_uuid(party_id)
    report = get_credit_report(clean_id)
    return jsonify(report), 200
