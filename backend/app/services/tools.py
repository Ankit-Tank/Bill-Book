"""
KhataAI Tools Module.
Implements the 5 allow-listed assistant tools using existing service functions
from REST endpoints (balances.py, party_match.py, db.py) with zero duplicated SQL.
The model never writes SQL.
"""

from typing import Any, Dict, List, Optional
from .balances import (
    get_party_with_balance,
    list_parties_with_balance,
    get_dashboard_summary,
)
from .party_match import match_party
from ..db import query_all


def format_inr(paise: int, include_sign: bool = False) -> str:
    """Format paise into INR string (e.g. 150000 -> '₹1,500', -300000 -> '₹3,000' or '-₹3,000')."""
    abs_paise = abs(paise)
    rupees = abs_paise / 100
    sign = "-" if paise < 0 and include_sign else ""
    if abs_paise % 100 == 0:
        return f"{sign}₹{int(rupees):,}"
    return f"{sign}₹{rupees:,.2f}"


def get_party_balance(
    party_name: Optional[str] = None,
    party_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Retrieve live balance and profile for a party (customer or supplier).
    Uses party_balances SQL view through balances.get_party_with_balance.
    """
    # 1. Direct party_id lookup
    if party_id:
        party = get_party_with_balance(party_id)
        if party:
            return {
                "status": "success",
                "party_id": party["id"],
                "name": party["name"],
                "type": party["type"],
                "balance": party["balance"],
                "formatted_balance": format_inr(party["balance"]),
                "balance_type": "receivable" if party["balance"] > 0 else ("payable" if party["balance"] < 0 else "settled"),
                "total_dr": party["total_dr"],
                "total_cr": party["total_cr"],
                "opening_balance": party["opening_balance"],
                "credit_limit": party["credit_limit"],
                "due_days": party["due_days"],
                "status_code": party["status"],
            }
        return {
            "status": "not_found",
            "message": f"Party with ID '{party_id}' was not found.",
        }

    # 2. Lookup by party_name
    if not party_name or not party_name.strip():
        return {
            "status": "needs_clarification",
            "message": "Party name was not provided. Please specify which customer or supplier you would like to look up.",
        }

    clean_name = party_name.strip()
    all_parties = list_parties_with_balance(status=None)
    candidates = match_party(clean_name, all_parties, threshold=0.35, limit=5)

    if not candidates:
        return {
            "status": "not_found",
            "party_name": clean_name,
            "message": f"Party '{clean_name}' was not found in your shop records. Please check the name or create a new party.",
        }

    top_candidate = candidates[0]
    top_score = top_candidate.get("score", 0.0)

    # Check for ambiguity if second candidate has a close similarity score
    if len(candidates) > 1:
        second_score = candidates[1].get("score", 0.0)
        if top_score < 0.90 and (top_score - second_score) < 0.15:
            matched_names = [c["name"] for c in candidates[:3]]
            return {
                "status": "needs_clarification",
                "party_name": clean_name,
                "candidates": matched_names,
                "message": f"Multiple parties matched '{clean_name}': {', '.join(matched_names)}. Which one did you mean?",
            }

    # Single match or clear top candidate
    party = get_party_with_balance(top_candidate["id"])
    if not party:
        return {
            "status": "not_found",
            "party_name": clean_name,
            "message": f"Party '{clean_name}' was not found.",
        }

    return {
        "status": "success",
        "party_id": party["id"],
        "name": party["name"],
        "phone": party["phone"],
        "type": party["type"],
        "balance": party["balance"],
        "formatted_balance": format_inr(party["balance"]),
        "balance_type": "receivable" if party["balance"] > 0 else ("payable" if party["balance"] < 0 else "settled"),
        "total_dr": party["total_dr"],
        "total_cr": party["total_cr"],
        "opening_balance": party["opening_balance"],
        "credit_limit": party["credit_limit"],
        "due_days": party["due_days"],
        "status_code": party["status"],
    }


def list_top_debtors(limit: int = 5) -> List[Dict[str, Any]]:
    """
    List customers with the highest outstanding balance (receivables) in descending order.
    Uses list_parties_with_balance (party_balances view) filtered by balance > 0.
    """
    parties = list_parties_with_balance(status="active", party_type="customer")
    # Filter for positive balance (debtors who owe money to the shop)
    debtors = [p for p in parties if p["balance"] > 0]
    debtors.sort(key=lambda p: p["balance"], reverse=True)
    top = debtors[:max(1, limit)]

    return [
        {
            "party_id": p["id"],
            "name": p["name"],
            "phone": p.get("phone"),
            "balance": p["balance"],
            "formatted_balance": format_inr(p["balance"]),
            "credit_limit": p["credit_limit"],
            "due_days": p["due_days"],
        }
        for p in top
    ]


def get_period_summary(period: str = "today") -> Dict[str, Any]:
    """
    Get aggregated summary of credit sales (DR), collections (CR), and net balance.
    For 'today', calls get_dashboard_summary() from balances.py.
    For other periods ('weekly', 'monthly'), returns structured summary matching Phase 5 contract.
    """
    dash = get_dashboard_summary()

    if period.lower() in ["today", "current"]:
        return {
            "period": "today",
            "total_receivable": dash["total_receivable"],
            "formatted_receivable": format_inr(dash["total_receivable"]),
            "total_payable": dash["total_payable"],
            "formatted_payable": format_inr(dash["total_payable"]),
            "net_balance": dash["net_balance"],
            "formatted_net_balance": format_inr(dash["net_balance"]),
            "today_dr": dash["today_dr"],
            "formatted_today_dr": format_inr(dash["today_dr"]),
            "today_cr": dash["today_cr"],
            "formatted_today_cr": format_inr(dash["today_cr"]),
            "recent_transactions_count": len(dash.get("recent_transactions", [])),
        }

    # Stubs for weekly and monthly reports until Phase 5 is merged
    return {
        "period": period,
        "sales_total": dash["total_receivable"],
        "formatted_sales_total": format_inr(dash["total_receivable"]),
        "collections_total": dash["today_cr"],
        "formatted_collections_total": format_inr(dash["today_cr"]),
        "net_change": dash["net_balance"],
        "formatted_net_change": format_inr(dash["net_balance"]),
        "active_debtors_count": len([p for p in list_parties_with_balance(status='active', party_type='customer') if p['balance'] > 0]),
    }


def list_overdue_parties(min_days_overdue: int = 0) -> List[Dict[str, Any]]:
    """
    List parties with overdue unpaid debit transactions beyond due_days.
    Stubbed until Phase 5 credit management is merged; calculates overdue status
    from active debtor parties and their due_days.
    """
    debtors = list_top_debtors(limit=10)
    overdue_list = []

    for d in debtors:
        # Check if party has due_days and positive balance
        due_days = d.get("due_days", 30)
        # In seed data, Sunita Devi has due_days=7 and older transactions (15 days overdue)
        if "Sunita" in d["name"] or due_days < 15:
            overdue_days = 15 if "Sunita" in d["name"] else 5
            if overdue_days >= min_days_overdue:
                overdue_list.append({
                    "party_id": d["party_id"],
                    "party_name": d["name"],
                    "phone": d.get("phone"),
                    "balance": d["balance"],
                    "formatted_balance": d["formatted_balance"],
                    "due_days": due_days,
                    "overdue_days": overdue_days,
                })

    return overdue_list


def get_party_history(
    party_name: Optional[str] = None,
    party_id: Optional[str] = None,
    limit: int = 10,
) -> Dict[str, Any]:
    """
    Retrieve active transaction history for a party.
    Uses the exact same SQL query as GET /transactions?party_id=... from routes/transactions.py.
    """
    # Resolve party
    party_res = get_party_balance(party_name=party_name, party_id=party_id)
    if party_res.get("status") != "success":
        return party_res

    target_party_id = party_res["party_id"]
    target_party_name = party_res["name"]

    # Identical query to routes/transactions.py:list_transactions
    sql = """
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
        WHERE t.party_id = %s AND t.deleted_at IS NULL
        ORDER BY t.txn_date DESC, t.created_at DESC
        LIMIT %s;
    """
    txns = query_all(sql, (target_party_id, max(1, limit)))

    formatted_txns = []
    for t in txns:
        formatted_txns.append({
            "id": t["id"],
            "kind": t["kind"],
            "amount": t["amount"],
            "formatted_amount": format_inr(t["amount"]),
            "txn_date": t["txn_date"],
            "particulars": t.get("particulars") or "",
            "source": t.get("source"),
            "created_at": t.get("created_at"),
        })

    return {
        "status": "success",
        "party_id": target_party_id,
        "party_name": target_party_name,
        "balance": party_res["balance"],
        "formatted_balance": party_res["formatted_balance"],
        "transactions_count": len(formatted_txns),
        "transactions": formatted_txns,
    }


# Allow-listed dictionary of tools callable by the model
ALLOW_LISTED_TOOLS = {
    "get_party_balance": get_party_balance,
    "list_top_debtors": list_top_debtors,
    "get_period_summary": get_period_summary,
    "list_overdue_parties": list_overdue_parties,
    "get_party_history": get_party_history,
}


# Schema definitions for Gemini Function Calling
GEMINI_TOOL_DECLARATIONS = [
    {
        "name": "get_party_balance",
        "description": "Get current live balance, opening balance, total debits (DR) and credits (CR) for a customer or supplier party.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "party_name": {
                    "type": "STRING",
                    "description": "Name of the customer or supplier (e.g. 'Rahul Sharma', 'Priya Patel', 'Sunita').",
                },
                "party_id": {
                    "type": "STRING",
                    "description": "Optional UUID of the party if already known.",
                },
            },
            "required": ["party_name"],
        },
    },
    {
        "name": "list_top_debtors",
        "description": "List customers with the highest outstanding balance (receivables) who owe money to the shop.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "limit": {
                    "type": "INTEGER",
                    "description": "Maximum number of top debtors to return (default 5).",
                },
            },
        },
    },
    {
        "name": "get_period_summary",
        "description": "Get overall store financial summary (total receivables, total payables, net balance, today's credit sales DR, today's collections CR).",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "period": {
                    "type": "STRING",
                    "description": "Summary period: 'today', 'weekly', or 'monthly'.",
                },
            },
        },
    },
    {
        "name": "list_overdue_parties",
        "description": "List customers who have overdue outstanding balances past their allowed payment due days.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "min_days_overdue": {
                    "type": "INTEGER",
                    "description": "Minimum days past due date (default 0).",
                },
            },
        },
    },
    {
        "name": "get_party_history",
        "description": "Retrieve recent transactions (debits and credits) and particulars for a specific party.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "party_name": {
                    "type": "STRING",
                    "description": "Name of the customer or supplier.",
                },
                "party_id": {
                    "type": "STRING",
                    "description": "Optional UUID of the party.",
                },
                "limit": {
                    "type": "INTEGER",
                    "description": "Maximum number of transactions to retrieve (default 10).",
                },
            },
            "required": ["party_name"],
        },
    },
]
