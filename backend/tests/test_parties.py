def test_list_parties_default(client, auth_headers):
    """Test listing active parties returns 6 seeded parties."""
    res = client.get("/api/v1/parties", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert "parties" in data
    assert data["total"] == 6
    assert len(data["parties"]) == 6

    first = data["parties"][0]
    expected_fields = [
        "id", "name", "phone", "type", "opening_balance",
        "credit_limit", "due_days", "status", "total_dr",
        "total_cr", "balance", "created_at"
    ]
    for field in expected_fields:
        assert field in first


def test_list_parties_filter_type(client, auth_headers):
    """Test filtering by type=customer and type=supplier."""
    res_cust = client.get("/api/v1/parties?type=customer", headers=auth_headers)
    assert res_cust.status_code == 200
    assert res_cust.get_json()["total"] == 4

    res_supp = client.get("/api/v1/parties?type=supplier", headers=auth_headers)
    assert res_supp.status_code == 200
    assert res_supp.get_json()["total"] == 2


def test_list_parties_search(client, auth_headers):
    """Test search substring on party name and phone."""
    res = client.get("/api/v1/parties?search=Rahul", headers=auth_headers)
    assert res.status_code == 200
    parties = res.get_json()["parties"]
    assert len(parties) == 1
    assert parties[0]["name"] == "Rahul Sharma"

    res_phone = client.get("/api/v1/parties?search=9811223344", headers=auth_headers)
    assert res_phone.status_code == 200
    parties_phone = res_phone.get_json()["parties"]
    assert len(parties_phone) == 1
    assert parties_phone[0]["name"] == "Priya Patel"


def test_create_party_success(client, auth_headers):
    """Test creating a party with initial balance."""
    payload = {
        "name": "Deepak Traders",
        "phone": "+919998887776",
        "type": "customer",
        "opening_balance": 25000,
        "credit_limit": 1000000,
        "due_days": 15,
    }
    res = client.post("/api/v1/parties", json=payload, headers=auth_headers)
    assert res.status_code == 201
    party = res.get_json()
    assert party["name"] == "Deepak Traders"
    assert party["opening_balance"] == 25000
    assert party["balance"] == 25000
    assert party["total_dr"] == 0
    assert party["total_cr"] == 0
    assert party["status"] == "active"


def test_create_party_validation_errors(client, auth_headers):
    """Test validation errors on invalid party payload."""
    # Invalid type
    res = client.post(
        "/api/v1/parties",
        json={"name": "Bad Party", "type": "unknown"},
        headers=auth_headers,
    )
    assert res.status_code == 400
    data = res.get_json()
    assert data["error"]["code"] == "INVALID_INPUT"

    # Missing name
    res2 = client.post(
        "/api/v1/parties",
        json={"type": "customer"},
        headers=auth_headers,
    )
    assert res2.status_code == 400
    assert res2.get_json()["error"]["code"] == "INVALID_INPUT"


def test_get_party_by_id(client, auth_headers):
    """Test getting single party profile."""
    party_id = "f47ac10b-58cc-4372-a567-0e02b2c3d471"
    res = client.get(f"/api/v1/parties/{party_id}", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["id"] == party_id
    assert data["name"] == "Rahul Sharma"
    assert data["balance"] == 300000


def test_get_party_not_found(client, auth_headers):
    """Test 404 PARTY_NOT_FOUND when party ID does not exist."""
    res = client.get("/api/v1/parties/00000000-0000-0000-0000-000000000000", headers=auth_headers)
    assert res.status_code == 404
    assert res.get_json()["error"]["code"] == "PARTY_NOT_FOUND"


def test_patch_party_success(client, auth_headers):
    """Test updating editable fields on party."""
    party_id = "f47ac10b-58cc-4372-a567-0e02b2c3d471"
    update_payload = {
        "credit_limit": 7500000,
        "due_days": 45,
    }
    res = client.patch(f"/api/v1/parties/{party_id}", json=update_payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["credit_limit"] == 7500000
    assert data["due_days"] == 45
    assert data["balance"] == 300000


def test_archive_party(client, auth_headers):
    """Test archiving party changes status and excludes from default active list."""
    party_id = "f47ac10b-58cc-4372-a567-0e02b2c3d471"
    res = client.post(f"/api/v1/parties/{party_id}/archive", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "archived"

    # Verify not present in active list
    res_list = client.get("/api/v1/parties?status=active", headers=auth_headers)
    ids = [p["id"] for p in res_list.get_json()["parties"]]
    assert party_id not in ids

    # Present in archived list
    res_archived = client.get("/api/v1/parties?status=archived", headers=auth_headers)
    ids_arch = [p["id"] for p in res_archived.get_json()["parties"]]
    assert party_id in ids_arch


def test_delete_party(client, auth_headers):
    """Test deleting party."""
    party_id = "f47ac10b-58cc-4372-a567-0e02b2c3d474"
    res = client.delete(f"/api/v1/parties/{party_id}", headers=auth_headers)
    assert res.status_code == 200
    assert res.get_json()["success"] is True

    # Subsequent GET returns 404
    res_get = client.get(f"/api/v1/parties/{party_id}", headers=auth_headers)
    assert res_get.status_code == 404
