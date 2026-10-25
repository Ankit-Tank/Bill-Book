from typing import Any, Dict, List, Optional
from ..db import query_all, query_one


def get_party_with_balance(party_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve party profile and live balance computed from the party_balances SQL view."""
    sql = """
        SELECT
            id,
            name,
            phone,
            type,
            opening_balance,
            credit_limit,
            due_days,
            status,
            total_dr,
            total_cr,
            balance,
            created_at
        FROM party_balances
        WHERE id = %s;
    """
    return query_one(sql, (party_id,))


def list_parties_with_balance(
    status: Optional[str] = "active",
    party_type: Optional[str] = None,
    search: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    List parties with balances computed from party_balances view.
    Filtered by status, type, and search keyword.
    """
    conditions = ["1=1"]
    params: List[Any] = []

    if status:
        conditions.append("status = %s")
        params.append(status)

    if party_type:
        conditions.append("type = %s")
        params.append(party_type)

    if search:
        conditions.append("(name ILIKE %s OR phone ILIKE %s)")
        search_pattern = f"%{search}%"
        params.extend([search_pattern, search_pattern])

    where_clause = " AND ".join(conditions)
    sql = f"""
        SELECT
            id,
            name,
            phone,
            type,
            opening_balance,
            credit_limit,
            due_days,
            status,
            total_dr,
            total_cr,
            balance,
            created_at
        FROM party_balances
        WHERE {where_clause}
        ORDER BY name ASC;
    """
    return query_all(sql, tuple(params))


def get_dashboard_summary() -> Dict[str, Any]:
    """
    Compute dashboard metrics in SQL using party_balances view and transaction aggregates.
    Zero Python loop calculations.
    """
    # 1. Total receivable, payable, and net balance from party_balances view
    balance_sql = """
        SELECT
            COALESCE(SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END), 0)::BIGINT AS total_receivable,
            COALESCE(SUM(CASE WHEN balance < 0 THEN -balance ELSE 0 END), 0)::BIGINT AS total_payable,
            COALESCE(SUM(balance), 0)::BIGINT AS net_balance
        FROM party_balances
        WHERE status = 'active';
    """
    balance_row = query_one(balance_sql) or {
        "total_receivable": 0,
        "total_payable": 0,
        "net_balance": 0,
    }

    # 2. Today's credit sales (DR) and payments received (CR)
    today_sql = """
        SELECT
            COALESCE(SUM(CASE WHEN kind = 'DR' THEN amount ELSE 0 END), 0)::BIGINT AS today_dr,
            COALESCE(SUM(CASE WHEN kind = 'CR' THEN amount ELSE 0 END), 0)::BIGINT AS today_cr
        FROM transactions
        WHERE deleted_at IS NULL AND txn_date = CURRENT_DATE;
    """
    today_row = query_one(today_sql) or {"today_dr": 0, "today_cr": 0}

    # 3. Recent 10 active transactions with party_name
    recent_sql = """
        SELECT
            t.id,
            t.party_id,
            p.name AS party_name,
            t.kind,
            t.amount,
            t.txn_date,
            t.particulars,
            t.source,
            t.bill_image_path,
            t.created_at
        FROM transactions t
        JOIN parties p ON p.id = t.party_id
        WHERE t.deleted_at IS NULL
        ORDER BY t.txn_date DESC, t.created_at DESC
        LIMIT 10;
    """
    recent_transactions = query_all(recent_sql)

    return {
        "total_receivable": balance_row["total_receivable"],
        "total_payable": balance_row["total_payable"],
        "net_balance": balance_row["net_balance"],
        "today_dr": today_row["today_dr"],
        "today_cr": today_row["today_cr"],
        "recent_transactions": recent_transactions,
    }
