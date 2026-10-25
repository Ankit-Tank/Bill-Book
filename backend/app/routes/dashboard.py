from flask import Blueprint, jsonify
from ..services.balances import get_dashboard_summary

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/dashboard/summary", methods=["GET"])
def summary():
    """Retrieve high-level dashboard financial summary and recent transactions."""
    data = get_dashboard_summary()
    return jsonify(data), 200
