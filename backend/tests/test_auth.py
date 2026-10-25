def test_missing_api_key_returns_401(client):
    """Protected endpoints require X-API-Key header."""
    protected_paths = [
        "/api/v1/parties",
        "/api/v1/transactions",
        "/api/v1/dashboard/summary",
    ]
    for path in protected_paths:
        res = client.get(path)
        assert res.status_code == 401
        data = res.get_json()
        assert "error" in data
        assert data["error"]["code"] == "UNAUTHORIZED"
        assert "message" in data["error"]


def test_invalid_api_key_returns_401(client):
    """Invalid X-API-Key returns 401 UNAUTHORIZED."""
    res = client.get("/api/v1/parties", headers={"X-API-Key": "wrong-key"})
    assert res.status_code == 401
    data = res.get_json()
    assert data["error"]["code"] == "UNAUTHORIZED"


def test_valid_api_key_succeeds(client, auth_headers):
    """Valid X-API-Key allows access."""
    res = client.get("/api/v1/parties", headers=auth_headers)
    assert res.status_code == 200
