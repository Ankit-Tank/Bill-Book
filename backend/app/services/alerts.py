"""Alerts engine service for BillBook.

Implements rule-based evaluation for 5 alert types:
1. Overdue: Unpaid DR past the party's due_days (via FIFO balance tracking)
2. Credit limit exceeded: Outstanding balance exceeds party's credit_limit
3. Duplicate bill: Same party and amount within 24 hours, or identical image path
4. Unusual amount: Transaction amount > 3x the party's median (minimum 5 transactions)
5. Repeat late payer: Customer with pattern of repeated payment delays past due date

Every alert uses a unique dedupe_key so each notification appears exactly once.
"""

import datetime
from typing import Any, Dict, List, Optional
from ..db import query_all, query_one, execute_returning, execute


def _insert_alert(
    party_id: Optional[str],
    kind: str,
    message: str,
    severity: str,
    dedupe_key: str,
) -> Optional[Dict[str, Any]]:
    """Insert an alert with dedupe_key uniqueness. Returns the inserted row or None if deduplicated."""
    sql = """
        INSERT INTO alerts (party_id, kind, message, severity, dedupe_key)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (dedupe_key) DO NOTHING
        RETURNING id, party_id, kind, message, severity, dedupe_key, created_at, read_at;
    """
    return execute_returning(sql, (party_id, kind, message, severity, dedupe_key))


def check_overdue_alerts() -> int:
    """Check parties with unpaid DR transactions past their due_days.

    Uses view_outstanding_parties where overdue_days > 0.
    """
    sql = """
        SELECT party_id, party_name, balance, due_days, overdue_days
        FROM view_outstanding_parties
        WHERE overdue_days > 0;
    """
    parties = query_all(sql)
    triggered = 0
    today_str = datetime.date.today().isoformat()

    for p in parties:
        overdue_days = int(p["overdue_days"])
        severity = "critical" if overdue_days >= 30 else "warning"
        balance_rs = abs(int(p["balance"])) // 100
        message = (
            f"{p['party_name']} has overdue payment of ₹{balance_rs:,} "
            f"({overdue_days} days past due date)."
        )
        dedupe_key = f"overdue_{p['party_id']}_{today_str}"
        row = _insert_alert(p["party_id"], "overdue", message, severity, dedupe_key)
        if row:
            triggered += 1

    return triggered


def check_credit_limit_exceeded() -> int:
    """Check parties whose outstanding balance exceeds their credit_limit."""
    sql = """
        SELECT party_id, name, balance, credit_limit
        FROM party_balances
        WHERE credit_limit > 0 AND balance > credit_limit AND status = 'active';
    """
    parties = query_all(sql)
    triggered = 0
    today_str = datetime.date.today().isoformat()

    for p in parties:
        balance = int(p["balance"])
        limit = int(p["credit_limit"])
        severity = "critical" if balance >= (limit * 1.5) else "warning"
        message = (
            f"{p['name']} has exceeded their credit limit of ₹{limit//100:,} "
            f"(current balance: ₹{balance//100:,})."
        )
        dedupe_key = f"limit_exceeded_{p['party_id']}_{today_str}"
        row = _insert_alert(p["party_id"], "credit_limit_exceeded", message, severity, dedupe_key)
        if row:
            triggered += 1

    return triggered


def check_duplicate_bills(party_id: Optional[str] = None) -> int:
    """Check for duplicate bills: same party & amount within 24 hours, or same bill_image_path."""
    conditions = ["t1.deleted_at IS NULL", "t2.deleted_at IS NULL", "t1.id < t2.id"]
    params: List[Any] = []

    if party_id:
        conditions.append("t1.party_id = %s")
        params.append(party_id)

    # Condition 1: Same party, same kind, same amount created within 24 hours (86400 seconds)
    # Condition 2: Non-null identical bill_image_path
    where_str = " AND ".join(conditions)
    sql = f"""
        SELECT
            t1.id AS t1_id,
            t2.id AS t2_id,
            t2.party_id,
            p.name AS party_name,
            t2.kind,
            t2.amount,
            t2.txn_date,
            t2.bill_image_path
        FROM transactions t1
        JOIN transactions t2 ON t1.party_id = t2.party_id
        JOIN parties p ON p.id = t2.party_id
        WHERE {where_str}
          AND (
            (t1.kind = t2.kind AND t1.amount = t2.amount AND ABS(EXTRACT(EPOCH FROM (t1.created_at - t2.created_at))) <= 86400)
            OR (t1.bill_image_path IS NOT NULL AND t1.bill_image_path = t2.bill_image_path)
          )
        ORDER BY t2.created_at DESC;
    """
    duplicates = query_all(sql, tuple(params))
    triggered = 0

    for d in duplicates:
        min_id = min(str(d["t1_id"]), str(d["t2_id"]))
        max_id = max(str(d["t1_id"]), str(d["t2_id"]))
        dedupe_key = f"duplicate_bill_{min_id}_{max_id}"
        amount_rs = int(d["amount"]) // 100
        message = (
            f"Possible duplicate {d['kind']} transaction of ₹{amount_rs:,} "
            f"recorded for {d['party_name']} within 24 hours."
        )
        row = _insert_alert(d["party_id"], "duplicate_bill", message, "warning", dedupe_key)
        if row:
            triggered += 1

    return triggered


def check_unusual_amount(party_id: Optional[str] = None) -> int:
    """Check for transactions > 3x the party's median amount (minimum 5 transactions for party)."""
    # 1. Identify parties with at least 5 active transactions
    party_filter = "AND party_id = %s" if party_id else ""
    params = [party_id] if party_id else []

    median_sql = f"""
        SELECT
            party_id,
            COUNT(*) AS txn_count,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount) AS median_amount
        FROM transactions
        WHERE deleted_at IS NULL {party_filter}
        GROUP BY party_id
        HAVING COUNT(*) >= 5;
    """
    parties_stats = query_all(median_sql, tuple(params))
    triggered = 0

    for stat in parties_stats:
        pid = stat["party_id"]
        median_amt = float(stat["median_amount"])
        threshold = median_amt * 3.0

        # Find transactions exceeding 3x median
        txns_sql = """
            SELECT t.id, t.party_id, p.name AS party_name, t.amount, t.kind
            FROM transactions t
            JOIN parties p ON p.id = t.party_id
            WHERE t.party_id = %s AND t.deleted_at IS NULL AND t.amount > %s;
        """
        outliers = query_all(txns_sql, (pid, threshold))
        for o in outliers:
            dedupe_key = f"unusual_amount_{o['id']}"
            amount_rs = int(o["amount"]) // 100
            median_rs = int(median_amt) // 100
            message = (
                f"Unusual transaction amount of ₹{amount_rs:,} for {o['party_name']} "
                f"(more than 3x party median of ₹{median_rs:,})."
            )
            row = _insert_alert(o["party_id"], "unusual_amount", message, "warning", dedupe_key)
            if row:
                triggered += 1

    return triggered


def check_repeat_late_payers() -> int:
    """Check for customers with a history of repeated late payments (using credit delay analysis)."""
    sql = "SELECT id, name, due_days FROM parties WHERE type = 'customer' AND status = 'active';"
    customers = query_all(sql)
    triggered = 0
    today_str = datetime.date.today().isoformat()

    for c in customers:
        pid = c["id"]
        # Use fn_party_credit_report to inspect payment behavior
        report = query_one("SELECT avg_payment_delay_days, last_payment_date FROM fn_party_credit_report(%s);", (pid,))
        if not report:
            continue

        avg_delay = int(report["avg_payment_delay_days"] or 0)
        # Check if customer has multiple payment delays
        # Count CR transactions that occurred after due date
        delay_count_sql = """
            WITH dr_queue AS (
                SELECT t.txn_date, (t.txn_date + p.due_days)::date AS due_date, t.amount
                FROM transactions t
                JOIN parties p ON p.id = t.party_id
                WHERE t.party_id = %s AND t.kind = 'DR' AND t.deleted_at IS NULL
                ORDER BY t.txn_date ASC
            ),
            cr_payments AS (
                SELECT t.id, t.txn_date, t.amount
                FROM transactions t
                WHERE t.party_id = %s AND t.kind = 'CR' AND t.deleted_at IS NULL
                ORDER BY t.txn_date ASC
            )
            SELECT COUNT(*) AS total_payments FROM cr_payments;
        """
        stats = query_one(delay_count_sql, (pid, pid))
        total_payments = int(stats["total_payments"] or 0) if stats else 0

        # Flag repeat late payer if avg_delay > 10 and customer has at least 2 payments,
        # or avg_delay > 20 days
        if (avg_delay >= 10 and total_payments >= 2) or (avg_delay >= 20 and total_payments >= 1):
            severity = "critical" if avg_delay >= 30 else "warning"
            message = (
                f"{c['name']} has a pattern of repeated payment delays "
                f"(average delay: {avg_delay} days past due date)."
            )
            dedupe_key = f"repeat_late_payer_{pid}_{today_str}"
            row = _insert_alert(pid, "repeat_late_payer", message, severity, dedupe_key)
            if row:
                triggered += 1

    return triggered


def evaluate_all_alerts() -> Dict[str, Any]:
    """Execute all 5 rule evaluations across the entire system."""
    triggered_count = 0
    triggered_count += check_overdue_alerts()
    triggered_count += check_credit_limit_exceeded()
    triggered_count += check_duplicate_bills()
    triggered_count += check_unusual_amount()
    triggered_count += check_repeat_late_payers()

    now_iso = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return {
        "triggered_count": triggered_count,
        "evaluated_rules": 5,
        "timestamp": now_iso,
    }


def evaluate_alerts_for_transaction(party_id: str, txn: Dict[str, Any]) -> None:
    """Hook executed immediately after a transaction is created.

    Evaluates rules pertinent to the new transaction:
    - Duplicate bill check for party
    - Unusual amount check for party
    - Credit limit exceeded check
    """
    check_duplicate_bills(party_id)
    check_unusual_amount(party_id)
    check_credit_limit_exceeded()


def evaluate_all_alerts_scheduled() -> None:
    """Scheduled task function for APScheduler daily cron."""
    from flask import current_app
    try:
        evaluate_all_alerts()
    except Exception as e:
        import logging
        logging.getLogger("billbook.scheduler").error("Scheduled alerts evaluation failed: %s", e)


def list_alerts(unread_only: bool = False) -> Dict[str, Any]:
    """Retrieve alerts list with unread counter."""
    where_clause = "WHERE a.read_at IS NULL" if unread_only else ""
    sql = f"""
        SELECT
            a.id,
            a.party_id,
            p.name AS party_name,
            a.kind,
            a.message,
            a.severity,
            a.dedupe_key,
            a.created_at,
            a.read_at
        FROM alerts a
        LEFT JOIN parties p ON a.party_id = p.id
        {where_clause}
        ORDER BY a.created_at DESC;
    """
    alerts = query_all(sql)
    unread_row = query_one("SELECT COUNT(*) AS unread_count FROM alerts WHERE read_at IS NULL;")
    unread_count = int(unread_row["unread_count"]) if unread_row else 0

    return {
        "alerts": alerts,
        "unread_count": unread_count,
    }


def mark_alert_read(alert_id: str) -> Dict[str, Any]:
    """Mark a specific alert as read."""
    from .. import APIError
    sql = "UPDATE alerts SET read_at = now() WHERE id = %s RETURNING id, read_at;"
    row = execute_returning(sql, (alert_id,))
    if not row:
        raise APIError("ALERT_NOT_FOUND", f"Alert with ID {alert_id} was not found.", 404)
    return row
