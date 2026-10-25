import uuid
from datetime import date
from typing import Any, List
from flask import Blueprint, request, jsonify
from ..schemas.transaction import CreateTransactionSchema, UpdateTransactionSchema
from ..db import query_all, query_one, execute, execute_returning

transactions_bp = Blueprint("transactions", __name__)


def validate_uuid(id_str: str, entity_name: str = "Transaction", not_found_code: str = "TRANSACTION_NOT_FOUND"):
    try:
        return str(uuid.UUID(id_str))
    except (ValueError, TypeError, AttributeError):
        from .. import APIError
        raise APIError(not_found_code, f"{entity_name} with ID {id_str} was not found.", 404)


def get_transaction_by_id(txn_id: str, include_deleted: bool = False):
    """Retrieve transaction joined with parties for party_name."""
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
            t.created_at,
            t.deleted_at
        FROM transactions t
        JOIN parties p ON p.id = t.party_id
        WHERE t.id = %s
    """
    if not include_deleted:
        sql += " AND t.deleted_at IS NULL;"
    else:
        sql += ";"
    return query_one(sql, (txn_id,))


@transactions_bp.route("/transactions", methods=["GET"])
def list_transactions():
    """List active transactions with optional filters on party_id, kind, and date range."""
    party_id = request.args.get("party_id")
    kind = request.args.get("kind")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    conditions = ["t.deleted_at IS NULL"]
    params: List[Any] = []

    if party_id:
        clean_party_id = validate_uuid(party_id, "Party", "PARTY_NOT_FOUND")
        conditions.append("t.party_id = %s")
        params.append(clean_party_id)

    if kind:
        conditions.append("t.kind = %s")
        params.append(kind)

    if start_date:
        conditions.append("t.txn_date >= %s")
        params.append(start_date)

    if end_date:
        conditions.append("t.txn_date <= %s")
        params.append(end_date)

    where_clause = " AND ".join(conditions)
    sql = f"""
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
            t.created_at,
            t.deleted_at
        FROM transactions t
        JOIN parties p ON p.id = t.party_id
        WHERE {where_clause}
        ORDER BY t.txn_date DESC, t.created_at DESC;
    """
    transactions = query_all(sql, tuple(params))
    return jsonify({
        "transactions": transactions,
        "total": len(transactions),
    }), 200


@transactions_bp.route("/transactions", methods=["POST"])
def create_transaction():
    """Create a new transaction (DR or CR)."""
    from .. import APIError
    body = request.get_json(silent=True)
    if body is None:
        raise APIError("INVALID_INPUT", "Request body must be valid JSON", 400)

    schema = CreateTransactionSchema(**body)
    party_id_str = str(schema.party_id)

    # Verify party exists
    party = query_one("SELECT id FROM parties WHERE id = %s;", (party_id_str,))
    if not party:
        raise APIError("PARTY_NOT_FOUND", f"Party with ID {party_id_str} was not found.", 404)

    txn_date = schema.txn_date or date.today()

    insert_sql = """
        INSERT INTO transactions (party_id, kind, amount, txn_date, particulars, source, bill_image_path)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id;
    """
    row = execute_returning(
        insert_sql,
        (
            party_id_str,
            schema.kind,
            schema.amount,
            txn_date,
            schema.particulars,
            schema.source,
            schema.bill_image_path,
        ),
    )
    txn_id = row["id"]
    txn = get_transaction_by_id(txn_id)
    return jsonify(txn), 201


@transactions_bp.route("/transactions/<txn_id>", methods=["PATCH"])
def patch_transaction(txn_id: str):
    """Update an existing active transaction."""
    from .. import APIError
    clean_id = validate_uuid(txn_id, "Transaction", "TRANSACTION_NOT_FOUND")

    existing = get_transaction_by_id(clean_id, include_deleted=False)
    if not existing:
        raise APIError("TRANSACTION_NOT_FOUND", f"Transaction with ID {clean_id} was not found.", 404)

    body = request.get_json(silent=True)
    if body is None:
        raise APIError("INVALID_INPUT", "Request body must be valid JSON", 400)

    schema = UpdateTransactionSchema(**body)
    update_data = schema.model_dump(exclude_unset=True)
    if not update_data:
        return jsonify(existing), 200

    if "party_id" in update_data and update_data["party_id"]:
        new_party_id = str(update_data["party_id"])
        party = query_one("SELECT id FROM parties WHERE id = %s;", (new_party_id,))
        if not party:
            raise APIError("PARTY_NOT_FOUND", f"Party with ID {new_party_id} was not found.", 404)
        update_data["party_id"] = new_party_id

    set_clauses = []
    params: List[Any] = []
    for field, value in update_data.items():
        set_clauses.append(f"{field} = %s")
        params.append(value)

    params.append(clean_id)
    update_sql = f"UPDATE transactions SET {', '.join(set_clauses)} WHERE id = %s AND deleted_at IS NULL;"
    execute(update_sql, tuple(params))

    updated_txn = get_transaction_by_id(clean_id)
    return jsonify(updated_txn), 200


@transactions_bp.route("/transactions/<txn_id>", methods=["DELETE"])
def soft_delete_transaction(txn_id: str):
    """Soft-delete a transaction by setting deleted_at = now()."""
    from .. import APIError
    clean_id = validate_uuid(txn_id, "Transaction", "TRANSACTION_NOT_FOUND")

    existing = get_transaction_by_id(clean_id, include_deleted=False)
    if not existing:
        raise APIError("TRANSACTION_NOT_FOUND", f"Transaction with ID {clean_id} was not found.", 404)

    delete_sql = """
        UPDATE transactions
        SET deleted_at = now()
        WHERE id = %s AND deleted_at IS NULL
        RETURNING deleted_at;
    """
    row = execute_returning(delete_sql, (clean_id,))
    return jsonify({
        "success": True,
        "message": "Transaction soft-deleted successfully",
        "deleted_at": row["deleted_at"],
    }), 200
