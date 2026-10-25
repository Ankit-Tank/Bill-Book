def test_health_without_api_key(client):
    """Test /health and /api/v1/health work without X-API-Key."""
    for path in ["/health", "/api/v1/health"]:
        res = client.get(path)
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "healthy"
        assert data["version"] == "1.0.0"
        assert "timestamp" in data
        assert data["timestamp"].endswith("Z")
