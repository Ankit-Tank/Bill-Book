"""Reports analytics service for BillBook.

Provides aggregated reports and CSV export generation:
- Day Book (day-by-day DR sales & CR collections log)
- Outstanding Receivables (parties owing money with overdue days)
- Payables (suppliers and advances owed)
- Collections (payment recovery trends & daily breakdown)
- Weekly Summary (sales, collections, net change, top 5 debtors, period comparison)
- Monthly Summary (monthly totals, month-over-month growth, top 5 debtors)

All money calculations are performed in integer paise using PostgreSQL views.
"""

import io
import csv
import calendar
import datetime
from typing import Any, Dict, List, Optional
from ..db import query_all, query_one


def _format_inr(paise: int) -> str:
    """Format integer paise into standard INR display format for CSV readability."""
    sign = "-" if paise < 0 else ""
    abs_paise = abs(paise)
    rupees = abs_paise // 100
    rem_paise = abs_paise % 100
    return f"{sign}{rupees}.{rem_paise:02d}"


def _validate_date(date_str: str, param_name: str = "date") -> datetime.date:
    """Validate YYYY-MM-DD date string."""
    from .. import APIError
    try:
        return datetime.date.fromisoformat(date_str)
    except (ValueError, TypeError):
        raise APIError("INVALID_INPUT", f"Parameter '{param_name}' must be a valid date in YYYY-MM-DD format", 400)


# ============================================================================
# 1. Day Book Report
# ============================================================================

def get_day_book_report(date_str: Optional[str] = None) -> Dict[str, Any]:
    """Retrieve Day Book of credit sales and payment collections for a specific date."""
    if not date_str:
        target_date = datetime.date.today()
        date_str = target_date.isoformat()
    else:
        target_date = _validate_date(date_str, "date")

    entries_sql = """
        SELECT
            t.id AS transaction_id,
            t.party_id,
            p.name AS party_name,
            t.kind,
            t.amount,
            t.particulars,
            t.created_at
        FROM transactions t
        JOIN parties p ON t.party_id = p.id
        WHERE t.deleted_at IS NULL AND t.txn_date = %s
        ORDER BY t.created_at DESC;
    """
    entries = query_all(entries_sql, (date_str,))

    total_dr = sum(e["amount"] for e in entries if e["kind"] == "DR")
    total_cr = sum(e["amount"] for e in entries if e["kind"] == "CR")
    net_change = total_dr - total_cr

    return {
        "date": date_str,
        "total_dr": total_dr,
        "total_cr": total_cr,
        "net_change": net_change,
        "entries": entries,
    }


def generate_day_book_csv(report: Dict[str, Any]) -> str:
    """Generate CSV text for Day Book report."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Day Book Report", report["date"]])
    writer.writerow(["Total DR (Sales)", report["total_dr"], _format_inr(report["total_dr"])])
    writer.writerow(["Total CR (Collections)", report["total_cr"], _format_inr(report["total_cr"])])
    writer.writerow(["Net Change", report["net_change"], _format_inr(report["net_change"])])
    writer.writerow([])
    writer.writerow(["Transaction ID", "Party ID", "Party Name", "Kind", "Amount (Paise)", "Amount (INR)", "Particulars", "Created At"])
    for e in report["entries"]:
        writer.writerow([
            e["transaction_id"],
            e["party_id"],
            e["party_name"],
            e["kind"],
            e["amount"],
            _format_inr(e["amount"]),
            e.get("particulars") or "",
            e["created_at"],
        ])
    return output.getvalue()


# ============================================================================
# 2. Outstanding Report (Receivables)
# ============================================================================

def get_outstanding_report() -> Dict[str, Any]:
    """Retrieve all parties with positive balance (receivables) with overdue days."""
    parties = query_all("SELECT party_id, party_name, phone, balance, due_days, overdue_days FROM view_outstanding_parties;")
    total_outstanding = sum(p["balance"] for p in parties)

    return {
        "total_outstanding": total_outstanding,
        "parties_count": len(parties),
        "parties": parties,
    }


def generate_outstanding_csv(report: Dict[str, Any]) -> str:
    """Generate CSV text for Outstanding Receivables report."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Outstanding Receivables Report"])
    writer.writerow(["Total Outstanding (Paise)", report["total_outstanding"]])
    writer.writerow(["Total Outstanding (INR)", _format_inr(report["total_outstanding"])])
    writer.writerow(["Parties Count", report["parties_count"]])
    writer.writerow([])
    writer.writerow(["Party ID", "Party Name", "Phone", "Balance (Paise)", "Balance (INR)", "Due Days", "Overdue Days"])
    for p in report["parties"]:
        writer.writerow([
            p["party_id"],
            p["party_name"],
            p.get("phone") or "",
            p["balance"],
            _format_inr(p["balance"]),
            p["due_days"],
            p["overdue_days"],
        ])
    return output.getvalue()


# ============================================================================
# 3. Payables Report (Suppliers & Advances)
# ============================================================================

def get_payables_report() -> Dict[str, Any]:
    """Retrieve all parties with negative balance (shop owes money)."""
    parties = query_all("SELECT party_id, party_name, phone, balance, due_days FROM view_payable_parties;")
    total_payable = sum(abs(p["balance"]) for p in parties)

    return {
        "total_payable": total_payable,
        "suppliers_count": len(parties),
        "parties": parties,
    }


def generate_payables_csv(report: Dict[str, Any]) -> str:
    """Generate CSV text for Payables report."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Payables Report"])
    writer.writerow(["Total Payable (Paise)", report["total_payable"]])
    writer.writerow(["Total Payable (INR)", _format_inr(report["total_payable"])])
    writer.writerow(["Suppliers Count", report["suppliers_count"]])
    writer.writerow([])
    writer.writerow(["Party ID", "Party Name", "Phone", "Balance (Paise)", "Balance (INR)", "Due Days"])
    for p in report["parties"]:
        writer.writerow([
            p["party_id"],
            p["party_name"],
            p.get("phone") or "",
            p["balance"],
            _format_inr(p["balance"]),
            p["due_days"],
        ])
    return output.getvalue()


# ============================================================================
# 4. Collection Report
# ============================================================================

def get_collection_report(start_date: Optional[str] = None, end_date: Optional[str] = None) -> Dict[str, Any]:
    """Retrieve payment recoveries across a date range with daily breakdown."""
    today = datetime.date.today()
    if not end_date:
        end_date = today.isoformat()
    else:
        _validate_date(end_date, "end_date")

    if not start_date:
        start_date = (today - datetime.timedelta(days=30)).isoformat()
    else:
        _validate_date(start_date, "start_date")

    daily = query_all(
        "SELECT date, amount, count FROM view_daily_collections WHERE date BETWEEN %s AND %s ORDER BY date ASC;",
        (start_date, end_date),
    )

    total_collected = sum(d["amount"] for d in daily)
    collections_count = sum(d["count"] for d in daily)

    return {
        "start_date": start_date,
        "end_date": end_date,
        "total_collected": total_collected,
        "collections_count": collections_count,
        "daily_breakdown": daily,
    }


def generate_collection_csv(report: Dict[str, Any]) -> str:
    """Generate CSV text for Collection report."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Collection Report", f"{report['start_date']} to {report['end_date']}"])
    writer.writerow(["Total Collected (Paise)", report["total_collected"]])
    writer.writerow(["Total Collected (INR)", _format_inr(report["total_collected"])])
    writer.writerow(["Collections Count", report["collections_count"]])
    writer.writerow([])
    writer.writerow(["Date", "Amount (Paise)", "Amount (INR)", "Count"])
    for d in report["daily_breakdown"]:
        writer.writerow([
            d["date"],
            d["amount"],
            _format_inr(d["amount"]),
            d["count"],
        ])
    return output.getvalue()


# ============================================================================
# 5. Weekly Summary Report
# ============================================================================

def get_weekly_report(start_date: Optional[str] = None, end_date: Optional[str] = None) -> Dict[str, Any]:
    """Retrieve 7-day business performance, top 5 debtors, and comparison with previous week."""
    today = datetime.date.today()
    if not end_date:
        end_obj = today
        end_date = end_obj.isoformat()
    else:
        end_obj = _validate_date(end_date, "end_date")

    if not start_date:
        start_obj = end_obj - datetime.timedelta(days=6)
        start_date = start_obj.isoformat()
    else:
        start_obj = _validate_date(start_date, "start_date")

    # Current period totals
    current_sql = """
        SELECT
            COALESCE(SUM(CASE WHEN kind = 'DR' THEN amount ELSE 0 END), 0)::BIGINT AS sales_total,
            COALESCE(SUM(CASE WHEN kind = 'CR' THEN amount ELSE 0 END), 0)::BIGINT AS collections_total
        FROM transactions
        WHERE deleted_at IS NULL AND txn_date BETWEEN %s AND %s;
    """
    curr = query_one(current_sql, (start_date, end_date)) or {"sales_total": 0, "collections_total": 0}
    sales_total = int(curr["sales_total"])
    collections_total = int(curr["collections_total"])
    net_change = sales_total - collections_total

    # Previous 7-day period for growth comparison
    prev_end = (start_obj - datetime.timedelta(days=1)).isoformat()
    prev_start = (start_obj - datetime.timedelta(days=7)).isoformat()
    prev_sql = """
        SELECT
            COALESCE(SUM(CASE WHEN kind = 'DR' THEN amount ELSE 0 END), 0)::BIGINT AS prev_sales_total
        FROM transactions
        WHERE deleted_at IS NULL AND txn_date BETWEEN %s AND %s;
    """
    prev = query_one(prev_sql, (prev_start, prev_end)) or {"prev_sales_total": 0}
    prev_sales = int(prev["prev_sales_total"])

    if prev_sales > 0:
        sales_growth_percent = round(((sales_total - prev_sales) / prev_sales) * 100.0, 1)
    else:
        sales_growth_percent = 100.0 if sales_total > 0 else 0.0

    # Top 5 debtors with highest outstanding balance
    top_sql = """
        SELECT party_id, name, balance
        FROM party_balances
        WHERE balance > 0 AND status = 'active'
        ORDER BY balance DESC
        LIMIT 5;
    """
    top_debtors = query_all(top_sql)

    return {
        "week_start": start_date,
        "week_end": end_date,
        "sales_total": sales_total,
        "collections_total": collections_total,
        "net_change": net_change,
        "sales_growth_percent": sales_growth_percent,
        "top_debtors": top_debtors,
    }


def generate_weekly_csv(report: Dict[str, Any]) -> str:
    """Generate CSV text for Weekly Summary report."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Weekly Summary Report", f"{report['week_start']} to {report['week_end']}"])
    writer.writerow(["Sales Total (Paise)", report["sales_total"]])
    writer.writerow(["Sales Total (INR)", _format_inr(report["sales_total"])])
    writer.writerow(["Collections Total (Paise)", report["collections_total"]])
    writer.writerow(["Collections Total (INR)", _format_inr(report["collections_total"])])
    writer.writerow(["Net Change (Paise)", report["net_change"]])
    writer.writerow(["Net Change (INR)", _format_inr(report["net_change"])])
    writer.writerow(["Sales Growth Percent", f"{report['sales_growth_percent']}%"])
    writer.writerow([])
    writer.writerow(["Top Debtors"])
    writer.writerow(["Party ID", "Name", "Balance (Paise)", "Balance (INR)"])
    for d in report["top_debtors"]:
        writer.writerow([
            d["party_id"],
            d["name"],
            d["balance"],
            _format_inr(d["balance"]),
        ])
    return output.getvalue()


# ============================================================================
# 6. Monthly Summary Report
# ============================================================================

def get_monthly_report(month_str: Optional[str] = None) -> Dict[str, Any]:
    """Retrieve monthly sales, collections, month-over-month growth, and top 5 debtors."""
    from .. import APIError
    today = datetime.date.today()
    if not month_str:
        year = today.year
        month = today.month
        month_str = f"{year:04d}-{month:02d}"
    else:
        try:
            parts = month_str.split("-")
            if len(parts) != 2:
                raise ValueError()
            year = int(parts[0])
            month = int(parts[1])
            if month < 1 or month > 12:
                raise ValueError()
        except (ValueError, TypeError):
            raise APIError("INVALID_INPUT", "Parameter 'month' must be in YYYY-MM format", 400)

    # Current month start and end dates
    last_day = calendar.monthrange(year, month)[1]
    curr_start = f"{year:04d}-{month:02d}-01"
    curr_end = f"{year:04d}-{month:02d}-{last_day:02d}"

    # Previous month start and end dates
    if month == 1:
        prev_year = year - 1
        prev_month = 12
    else:
        prev_year = year
        prev_month = month - 1
    prev_last_day = calendar.monthrange(prev_year, prev_month)[1]
    prev_start = f"{prev_year:04d}-{prev_month:02d}-01"
    prev_end = f"{prev_year:04d}-{prev_month:02d}-{prev_last_day:02d}"

    # Current month sales & collections
    curr_sql = """
        SELECT
            COALESCE(SUM(CASE WHEN kind = 'DR' THEN amount ELSE 0 END), 0)::BIGINT AS sales_total,
            COALESCE(SUM(CASE WHEN kind = 'CR' THEN amount ELSE 0 END), 0)::BIGINT AS collections_total
        FROM transactions
        WHERE deleted_at IS NULL AND txn_date BETWEEN %s AND %s;
    """
    curr = query_one(curr_sql, (curr_start, curr_end)) or {"sales_total": 0, "collections_total": 0}
    sales_total = int(curr["sales_total"])
    collections_total = int(curr["collections_total"])
    net_change = sales_total - collections_total

    # Previous month sales & collections
    prev_sql = """
        SELECT
            COALESCE(SUM(CASE WHEN kind = 'DR' THEN amount ELSE 0 END), 0)::BIGINT AS prev_sales,
            COALESCE(SUM(CASE WHEN kind = 'CR' THEN amount ELSE 0 END), 0)::BIGINT AS prev_collections
        FROM transactions
        WHERE deleted_at IS NULL AND txn_date BETWEEN %s AND %s;
    """
    prev = query_one(prev_sql, (prev_start, prev_end)) or {"prev_sales": 0, "prev_collections": 0}
    prev_sales = int(prev["prev_sales"])
    prev_collections = int(prev["prev_collections"])

    if prev_sales > 0:
        sales_growth_percent = round(((sales_total - prev_sales) / prev_sales) * 100.0, 1)
    else:
        sales_growth_percent = 100.0 if sales_total > 0 else 0.0

    if prev_collections > 0:
        collections_growth_percent = round(((collections_total - prev_collections) / prev_collections) * 100.0, 1)
    else:
        collections_growth_percent = 100.0 if collections_total > 0 else 0.0

    # Top 5 debtors
    top_sql = """
        SELECT party_id, name, balance
        FROM party_balances
        WHERE balance > 0 AND status = 'active'
        ORDER BY balance DESC
        LIMIT 5;
    """
    top_debtors = query_all(top_sql)

    return {
        "month": month_str,
        "sales_total": sales_total,
        "collections_total": collections_total,
        "net_change": net_change,
        "previous_month_comparison": {
            "sales_growth_percent": sales_growth_percent,
            "collections_growth_percent": collections_growth_percent,
        },
        "top_debtors": top_debtors,
    }


def generate_monthly_csv(report: Dict[str, Any]) -> str:
    """Generate CSV text for Monthly Summary report."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Monthly Summary Report", report["month"]])
    writer.writerow(["Sales Total (Paise)", report["sales_total"]])
    writer.writerow(["Sales Total (INR)", _format_inr(report["sales_total"])])
    writer.writerow(["Collections Total (Paise)", report["collections_total"]])
    writer.writerow(["Collections Total (INR)", _format_inr(report["collections_total"])])
    writer.writerow(["Net Change (Paise)", report["net_change"]])
    writer.writerow(["Net Change (INR)", _format_inr(report["net_change"])])
    writer.writerow(["Sales Growth vs Prev Month", f"{report['previous_month_comparison']['sales_growth_percent']}%"])
    writer.writerow(["Collections Growth vs Prev Month", f"{report['previous_month_comparison']['collections_growth_percent']}%"])
    writer.writerow([])
    writer.writerow(["Top Debtors"])
    writer.writerow(["Party ID", "Name", "Balance (Paise)", "Balance (INR)"])
    for d in report["top_debtors"]:
        writer.writerow([
            d["party_id"],
            d["name"],
            d["balance"],
            _format_inr(d["balance"]),
        ])
    return output.getvalue()
