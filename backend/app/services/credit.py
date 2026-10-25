"""Credit management service.

Computes party credit health, aging buckets, limit usage, and average payment delay
using SQL stored procedures and views in Supabase Postgres.
"""

from typing import Any, Dict, Optional
from ..db import query_one
from ..services.balances import get_party_with_balance


def get_credit_report(party_id: str) -> Dict[str, Any]:
    """Retrieve detailed credit risk report for a specific party.

    Calculates:
    - total_outstanding: current debt in paise
    - limit_usage_percent: percentage of credit limit utilized
    - avg_payment_delay_days: average days payments lagged past due dates (FIFO)
    - aging_buckets: days_0_30, days_31_60, days_60_plus breakdown
    - last_payment_date & last_payment_amount
    - risk_level: rule-based rating ('low' | 'moderate' | 'high')
    """
    from .. import APIError

    party = get_party_with_balance(party_id)
    if not party:
        raise APIError("PARTY_NOT_FOUND", f"Party with ID {party_id} was not found.", 404)

    # Call the stored SQL procedure fn_party_credit_report
    row = query_one("SELECT * FROM fn_party_credit_report(%s);", (party_id,))

    if row:
        limit_usage = float(row["limit_usage_percent"]) if row["limit_usage_percent"] is not None else 0.0
        return {
            "party_id": row["party_id"],
            "party_name": row["party_name"],
            "credit_limit": int(row["credit_limit"] or 0),
            "total_outstanding": int(row["total_outstanding"] or 0),
            "limit_usage_percent": limit_usage,
            "avg_payment_delay_days": int(row["avg_payment_delay_days"] or 0),
            "aging_buckets": {
                "days_0_30": int(row["days_0_30"] or 0),
                "days_31_60": int(row["days_31_60"] or 0),
                "days_60_plus": int(row["days_60_plus"] or 0),
            },
            "last_payment_date": row["last_payment_date"],
            "last_payment_amount": int(row["last_payment_amount"]) if row["last_payment_amount"] is not None else None,
            "risk_level": row["risk_level"] or "low",
        }

    # Fallback default when no transaction data exists
    total_outstanding = max(0, int(party.get("balance") or party.get("opening_balance") or 0))
    limit = int(party.get("credit_limit") or 0)
    usage = round((total_outstanding / limit) * 100, 1) if limit > 0 else 0.0

    risk_level = "low"
    if usage > 85.0:
        risk_level = "high"
    elif usage > 50.0:
        risk_level = "moderate"

    return {
        "party_id": party["id"],
        "party_name": party["name"],
        "credit_limit": limit,
        "total_outstanding": total_outstanding,
        "limit_usage_percent": usage,
        "avg_payment_delay_days": 0,
        "aging_buckets": {
            "days_0_30": total_outstanding,
            "days_31_60": 0,
            "days_60_plus": 0,
        },
        "last_payment_date": None,
        "last_payment_amount": None,
        "risk_level": risk_level,
    }
