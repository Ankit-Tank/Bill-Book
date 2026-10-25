from datetime import date


def test_list_transactions_default(client, auth_headers):
    """Test listing active transactions excludes soft-deleted."""
    res = client.get("/api/v1/transactions", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert "transactions" in data
    # 20 active transactions seeded (1 soft-deleted is omitted)
    assert data["total"] == 20
    assert len(data["transactions"]) == 20

    first = data["transactions"][0]
    expected_fields = [
        "id", "party_id", "party_name", "kind", "amount",
        "txn_date", "particulars", "source", "bill_image_path",
        "created_at", "deleted_at"
    ]
    for field in expected_fields:
        assert field in first
    assert first["deleted_at"] is None


def test_list_transactions_filter_party(client, auth_headers):
    """Test filtering transactions by party_id."""
    party_id = "f47ac10b-58cc-4372-a567-0e02b2c3d471"
    res = client.get(f"/api/v1/transactions?party_id={party_id}", headers=auth_headers)
    assert res.status_code == 200
    txns = res.get_json()["transactions"]
    assert len(txns) == 3
    for t in txns:
        assert t["party_id"] == party_id
        assert t["party_name"] == "Rahul Sharma"


def test_list_transactions_filter_kind(client, auth_headers):
    """Test filtering by kind DR and CR."""
    res_dr = client.get("/api/v1/transactions?kind=DR", headers=auth_headers)
    assert res_dr.status_code == 200
    for t in res_dr.get_json()["transactions"]:
        assert t["kind"] == "DR"

    res_cr = client.get("/api/v1/transactions?kind=CR", headers=auth_headers)
    assert res_cr.status_code == 200
    for t in res_cr.get_json()["transactions"]:
        assert t["kind"] == "CR"


def test_create_transaction_success(client, auth_headers):
    """Test creating a DR credit sale transaction."""
    party_id = "f47ac10b-58cc-4372-a567-0e02b2c3d471"
    payload = {
        "party_id": party_id,
        "kind": "DR",
        "amount": 50000,
        "particulars": "1 carton biscuit, 2 packs tea",
        "source": "manual",
    }
    res = client.post("/api/v1/transactions", json=payload, headers=auth_headers)
    assert res.status_code == 201
    txn = res.get_json()
    assert txn["party_id"] == party_id
    assert txn["party_name"] == "Rahul Sharma"
    assert txn["amount"] == 50000
    assert txn["kind"] == "DR"
    assert txn["deleted_at"] is None

    # Check updated balance in party_balances view
    res_party = client.get(f"/api/v1/parties/{party_id}", headers=auth_headers)
    # Previous balance 300000 + 50000 = 350000
    assert res_party.get_json()["balance"] == 350000


def test_create_transaction_amount_must_be_positive_integer(client, auth_headers):
    """Amounts must be strictly positive integers."""
    party_id = "f47ac10b-58cc-4372-a567-0e02b2c3d471"

    # Zero amount
    res_zero = client.post(
        "/api/v1/transactions",
        json={"party_id": party_id, "kind": "DR", "amount": 0},
        headers=auth_headers,
    )
    assert res_zero.status_code == 400
    assert res_zero.get_json()["error"]["code"] == "INVALID_INPUT"

    # Negative amount
    res_neg = client.post(
        "/api/v1/transactions",
        json={"party_id": party_id, "kind": "DR", "amount": -5000},
        headers=auth_headers,
    )
    assert res_neg.status_code == 400
    assert res_neg.get_json()["error"]["code"] == "INVALID_INPUT"


def test_create_transaction_nonexistent_party_fails(client, auth_headers):
    """Creating a transaction for unknown party returns 404."""
    res = client.post(
        "/api/v1/transactions",
        json={
            "party_id": "00000000-0000-0000-0000-000000000000",
            "kind": "DR",
            "amount": 10000,
        },
        headers=auth_headers,
    )
    assert res.status_code == 404
    assert res.get_json()["error"]["code"] == "PARTY_NOT_FOUND"


def test_patch_transaction_success(client, auth_headers):
    """Test updating transaction amount and particulars."""
    txn_id = "e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e401"
    patch_payload = {
        "amount": 260000,
        "particulars": "Updated items and delivery charges",
    }
    res = client.patch(f"/api/v1/transactions/{txn_id}", json=patch_payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["amount"] == 260000
    assert data["particulars"] == "Updated items and delivery charges"
    assert data["party_name"] == "Rahul Sharma"

    # Verify balance updated: Rahul was 300000, amount increased by 110000 (from 150000 to 260000) -> 410000
    party_res = client.get("/api/v1/parties/f47ac10b-58cc-4372-a567-0e02b2c3d471", headers=auth_headers)
    assert party_res.get_json()["balance"] == 410000


def test_soft_delete_transaction(client, auth_headers):
    """Test soft-deleting transaction sets deleted_at and recalculates balance."""
    txn_id = "e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e401"
    res = client.delete(f"/api/v1/transactions/{txn_id}", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "deleted_at" in data
    assert data["deleted_at"] is not None

    # Excluded from active transactions list
    res_list = client.get("/api/v1/transactions", headers=auth_headers)
    ids = [t["id"] for t in res_list.get_json()["transactions"]]
    assert txn_id not in ids

    # Balance recalculated: Rahul was 300000, after deleting Txn 1 (DR 150000), balance is 150000
    party_res = client.get("/api/v1/parties/f47ac10b-58cc-4372-a567-0e02b2c3d471", headers=auth_headers)
    assert party_res.get_json()["balance"] == 150000
