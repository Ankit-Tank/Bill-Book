import uuid
from typing import Any, Dict, List
from flask import Blueprint, request, jsonify
from ..schemas.party import CreatePartySchema, UpdatePartySchema
from ..services.balances import (
    get_party_with_balance,
    list_parties_with_balance,
)
from ..db import execute, execute_returning

parties_bp = Blueprint("parties", __name__)


def validate_uuid(id_str: str, entity_name: str = "Party", not_found_code: str = "PARTY_NOT_FOUND"):
    try:
        return str(uuid.UUID(id_str))
    except (ValueError, TypeError, AttributeError):
        from .. import APIError
        raise APIError(not_found_code, f"{entity_name} with ID {id_str} was not found.", 404)


@parties_bp.route("/parties", methods=["GET"])
def list_parties():
    """List parties with computed balances from party_balances view."""
    status = request.args.get("status", "active")
    if status == "all" or status == "":
        status = None
    party_type = request.args.get("type")
    search = request.args.get("search")

    parties = list_parties_with_balance(
        status=status,
        party_type=party_type,
        search=search,
    )
    return jsonify({
        "parties": parties,
        "total": len(parties),
    }), 200


@parties_bp.route("/parties", methods=["POST"])
def create_party():
    """Create a new customer or supplier party."""
    from .. import APIError
    body = request.get_json(silent=True)
    if body is None:
        raise APIError("INVALID_INPUT", "Request body must be valid JSON", 400)

    schema = CreatePartySchema(**body)

    insert_sql = """
        INSERT INTO parties (name, phone, type, opening_balance, credit_limit, due_days, status)
        VALUES (%s, %s, %s, %s, %s, %s, 'active')
        RETURNING id;
    """
    row = execute_returning(
        insert_sql,
        (
            schema.name,
            schema.phone,
            schema.type,
            schema.opening_balance,
            schema.credit_limit,
            schema.due_days,
        ),
    )
    party_id = row["id"]
    party = get_party_with_balance(party_id)
    return jsonify(party), 201


@parties_bp.route("/parties/<party_id>", methods=["GET"])
def get_party(party_id: str):
    """Retrieve party profile and live balance by ID."""
    from .. import APIError
    clean_id = validate_uuid(party_id, "Party", "PARTY_NOT_FOUND")
    party = get_party_with_balance(clean_id)
    if not party:
        raise APIError("PARTY_NOT_FOUND", f"Party with ID {clean_id} was not found.", 404)
    return jsonify(party), 200


@parties_bp.route("/parties/<party_id>", methods=["PATCH"])
def patch_party(party_id: str):
    """Update editable party fields."""
    from .. import APIError
    clean_id = validate_uuid(party_id, "Party", "PARTY_NOT_FOUND")

    existing = get_party_with_balance(clean_id)
    if not existing:
        raise APIError("PARTY_NOT_FOUND", f"Party with ID {clean_id} was not found.", 404)

    body = request.get_json(silent=True)
    if body is None:
        raise APIError("INVALID_INPUT", "Request body must be valid JSON", 400)

    schema = UpdatePartySchema(**body)
    update_data = schema.model_dump(exclude_unset=True)
    if not update_data:
        return jsonify(existing), 200

    set_clauses = []
    params: List[Any] = []
    for field, value in update_data.items():
        set_clauses.append(f"{field} = %s")
        params.append(value)

    params.append(clean_id)
    update_sql = f"UPDATE parties SET {', '.join(set_clauses)} WHERE id = %s;"
    execute(update_sql, tuple(params))

    updated_party = get_party_with_balance(clean_id)
    return jsonify(updated_party), 200


@parties_bp.route("/parties/<party_id>", methods=["DELETE"])
def delete_party(party_id: str):
    """Delete a party and associated cascade data."""
    from .. import APIError
    clean_id = validate_uuid(party_id, "Party", "PARTY_NOT_FOUND")

    existing = get_party_with_balance(clean_id)
    if not existing:
        raise APIError("PARTY_NOT_FOUND", f"Party with ID {clean_id} was not found.", 404)

    execute("DELETE FROM parties WHERE id = %s;", (clean_id,))
    return jsonify({
        "success": True,
        "message": "Party deleted successfully",
    }), 200


@parties_bp.route("/parties/<party_id>/archive", methods=["POST"])
def archive_party(party_id: str):
    """Archive an active party without deleting ledger records."""
    from .. import APIError
    clean_id = validate_uuid(party_id, "Party", "PARTY_NOT_FOUND")

    existing = get_party_with_balance(clean_id)
    if not existing:
        raise APIError("PARTY_NOT_FOUND", f"Party with ID {clean_id} was not found.", 404)

    execute("UPDATE parties SET status = 'archived' WHERE id = %s;", (clean_id,))
    return jsonify({
        "id": clean_id,
        "status": "archived",
        "message": "Party archived successfully",
    }), 200
