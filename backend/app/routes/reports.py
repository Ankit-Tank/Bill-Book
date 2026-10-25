"""Business analytics and reports routes.

Provides:
- GET /api/v1/reports/day-book (?date=YYYY-MM-DD&format=csv)
- GET /api/v1/reports/outstanding (?format=csv)
- GET /api/v1/reports/payables (?format=csv)
- GET /api/v1/reports/collection (?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&format=csv)
- GET /api/v1/reports/weekly (?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&format=csv)
- GET /api/v1/reports/monthly (?month=YYYY-MM&format=csv)

Every report supports ?format=csv for spreadsheet export.
"""

from flask import Blueprint, request, jsonify, Response
from ..services.reports import (
    get_day_book_report,
    generate_day_book_csv,
    get_outstanding_report,
    generate_outstanding_csv,
    get_payables_report,
    generate_payables_csv,
    get_collection_report,
    generate_collection_csv,
    get_weekly_report,
    generate_weekly_csv,
    get_monthly_report,
    generate_monthly_csv,
)

reports_bp = Blueprint("reports", __name__)


def _is_csv_requested() -> bool:
    """Check if the client requested CSV output format."""
    fmt = request.args.get("format", "").strip().lower()
    return fmt == "csv"


def _make_csv_response(csv_content: str, filename: str) -> Response:
    """Construct an HTTP response with CSV content and download headers."""
    # Prefix with UTF-8 BOM so spreadsheet apps like Microsoft Excel open characters seamlessly
    bom_content = "\ufeff" + csv_content
    return Response(
        bom_content,
        mimetype="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename=\"{filename}\"",
            "Cache-Control": "no-cache",
        },
    )


@reports_bp.route("/reports/day-book", methods=["GET"])
def day_book():
    """Retrieve Day Book for a specific date (defaults to today)."""
    date_str = request.args.get("date")
    report = get_day_book_report(date_str)
    if _is_csv_requested():
        csv_text = generate_day_book_csv(report)
        return _make_csv_response(csv_text, f"day-book-{report['date']}.csv")
    return jsonify(report), 200


@reports_bp.route("/reports/outstanding", methods=["GET"])
def outstanding():
    """Retrieve all parties with positive balance (receivables) with overdue days."""
    report = get_outstanding_report()
    if _is_csv_requested():
        csv_text = generate_outstanding_csv(report)
        return _make_csv_response(csv_text, "outstanding-receivables.csv")
    return jsonify(report), 200


@reports_bp.route("/reports/payables", methods=["GET"])
def payables():
    """Retrieve all parties with negative balance (payables / supplier credit)."""
    report = get_payables_report()
    if _is_csv_requested():
        csv_text = generate_payables_csv(report)
        return _make_csv_response(csv_text, "payables.csv")
    return jsonify(report), 200


@reports_bp.route("/reports/collection", methods=["GET"])
def collection():
    """Retrieve payment collections across a date range."""
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    report = get_collection_report(start_date, end_date)
    if _is_csv_requested():
        csv_text = generate_collection_csv(report)
        return _make_csv_response(csv_text, f"collection-{report['start_date']}-to-{report['end_date']}.csv")
    return jsonify(report), 200


@reports_bp.route("/reports/weekly", methods=["GET"])
def weekly():
    """Retrieve 7-day business performance, top 5 debtors, and comparison with previous week."""
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    report = get_weekly_report(start_date, end_date)
    if _is_csv_requested():
        csv_text = generate_weekly_csv(report)
        return _make_csv_response(csv_text, f"weekly-{report['week_start']}-to-{report['week_end']}.csv")
    return jsonify(report), 200


@reports_bp.route("/reports/monthly", methods=["GET"])
def monthly():
    """Retrieve monthly overview, month-over-month growth, and top 5 debtors."""
    month_str = request.args.get("month")
    report = get_monthly_report(month_str)
    if _is_csv_requested():
        csv_text = generate_monthly_csv(report)
        return _make_csv_response(csv_text, f"monthly-{report['month']}.csv")
    return jsonify(report), 200
