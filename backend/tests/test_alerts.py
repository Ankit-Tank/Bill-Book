"""Automated test suite for Phase 8: Alerts Engine & Backend Hardening.

Verifies:
1. Clean data produces exactly 0 alerts.
2. Demo / dirty data produces exactly 1 of each of the 5 alert rules (5 alerts total).
3. Running alert evaluation twice produces 0 duplicate alerts (dedupe_key constraint).
4. Alert endpoints: GET /api/v1/alerts, POST /api/v1/alerts/:id/read, POST /api/v1/alerts/run.
5. Transaction creation hook immediately triggers rule evaluation.
6. Authentication & standard error envelope checks (401, 404, 400).
7. AI route rate limiting (30 requests/minute, 429 RATE_LIMIT_EXCEEDED).
8. Payload upload size limits (413 PAYLOAD_TOO_LARGE).
9. CORS origin restrictions (PieHost & localhost allowed, unauthorized origins rejected).
"""

import io
import uuid
import pytest
from backend.app.db import execute, query_all, query_one
from backend.app.services.alerts import evaluate_all_alerts
from backend.scripts.seed_demo import seed_demo_shop
from backend.app.routes.ai import reset_rate_limits


def test_clean_data_produces_no_alerts(app, client, auth_headers):
    """Clean data (default seed.sql) must trigger 0 alerts across all 5 rules."""
    with app.app_context():
        result = evaluate_all_alerts()
        assert result["evaluated_rules"] == 5
        assert result["triggered_count"] == 0

    resp = client.get("/api/v1/alerts", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert "alerts" in data
    assert "unread_count" in data
    assert data["unread_count"] == 0
    assert len(data["alerts"]) == 0


def test_each_rule_fires_on_demo_data(client, auth_headers):
    """Seed demo shop triggers all 5 alert rules exactly once."""
    seed_demo_shop()

    # Alerts should already be triggered by seed_demo_shop
    resp = client.get("/api/v1/alerts", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["unread_count"] == 5
    assert len(data["alerts"]) == 5

    kinds = {a["kind"] for a in data["alerts"]}
    expected_kinds = {
        "overdue",
        "credit_limit_exceeded",
        "duplicate_bill",
        "unusual_amount",
        "repeat_late_payer",
    }
    assert kinds == expected_kinds, f"Missing alert kinds: {expected_kinds - kinds}"

    # Verify standard alert envelope fields
    for alert in data["alerts"]:
        assert "id" in alert
        assert "party_id" in alert
        assert "party_name" in alert
        assert "kind" in alert
        assert "message" in alert
        assert "severity" in alert
        assert alert["severity"] in ("info", "warning", "critical")
        assert "dedupe_key" in alert
        assert "created_at" in alert
        assert alert["read_at"] is None


def test_running_job_twice_creates_no_duplicates(app, client, auth_headers):
    """Running alert evaluation multiple times must create 0 duplicate alerts."""
    seed_demo_shop()

    with app.app_context():
        # Verify 5 alerts initially
        initial_alerts = query_all("SELECT id, dedupe_key FROM alerts;")
        assert len(initial_alerts) == 5

        # Run evaluation a second time
        result2 = evaluate_all_alerts()
        assert result2["triggered_count"] == 0

    # Run evaluation a third time via the POST /api/v1/alerts/run endpoint
    run_resp = client.post("/api/v1/alerts/run", headers=auth_headers)
    assert run_resp.status_code == 200
    run_data = run_resp.get_json()
    assert run_data["triggered_count"] == 0
    assert run_data["evaluated_rules"] == 5

    # Ensure alerts count remains exactly 5
    with app.app_context():
        after_alerts = query_all("SELECT id, dedupe_key FROM alerts;")
        assert len(after_alerts) == 5


def test_mark_alert_read_and_unread_filter(client, auth_headers):
    """Test POST /api/v1/alerts/:id/read and ?unread_only query filtering."""
    seed_demo_shop()

    # Fetch alerts
    list_resp = client.get("/api/v1/alerts", headers=auth_headers)
    alerts = list_resp.get_json()["alerts"]
    assert len(alerts) == 5
    target_alert_id = alerts[0]["id"]

    # Mark first alert as read
    read_resp = client.post(f"/api/v1/alerts/{target_alert_id}/read", headers=auth_headers)
    assert read_resp.status_code == 200
    read_data = read_resp.get_json()
    assert read_data["id"] == target_alert_id
    assert read_data["read_at"] is not None

    # Query with unread_only=true
    unread_resp = client.get("/api/v1/alerts?unread_only=true", headers=auth_headers)
    assert unread_resp.status_code == 200
    unread_data = unread_resp.get_json()
    assert unread_data["unread_count"] == 4
    assert len(unread_data["alerts"]) == 4
    unread_ids = {a["id"] for a in unread_data["alerts"]}
    assert target_alert_id not in unread_ids

    # Query without unread_only (should return all 5, with unread_count=4)
    all_resp = client.get("/api/v1/alerts", headers=auth_headers)
    all_data = all_resp.get_json()
    assert all_data["unread_count"] == 4
    assert len(all_data["alerts"]) == 5


def test_transaction_creation_triggers_alert_hook(client, auth_headers):
    """Adding a transaction that violates a rule should trigger an alert via transaction hook."""
    # Create customer with a tight credit limit: ₹1,000 (100,000 paise)
    party_resp = client.post("/api/v1/parties", headers=auth_headers, json={
        "name": "Hook Test Customer",
        "phone": "+919999000111",
        "type": "customer",
        "credit_limit": 100000,
        "due_days": 15,
    })
    assert party_resp.status_code == 201
    party_id = party_resp.get_json()["id"]

    # Post DR transaction for ₹2,500 (250,000 paise) - exceeds credit limit
    txn_resp = client.post("/api/v1/transactions", headers=auth_headers, json={
        "party_id": party_id,
        "kind": "DR",
        "amount": 250000,
        "particulars": "Heavy purchase exceeding limit",
        "source": "manual",
    })
    assert txn_resp.status_code == 201

    # Check that alert was automatically generated
    alerts_resp = client.get("/api/v1/alerts", headers=auth_headers)
    alerts = alerts_resp.get_json()["alerts"]
    limit_alerts = [a for a in alerts if a["party_id"] == party_id and a["kind"] == "credit_limit_exceeded"]
    assert len(limit_alerts) == 1
    assert "exceeded their credit limit" in limit_alerts[0]["message"]


def test_alerts_authentication_and_error_shapes(client, auth_headers):
    """Alerts endpoints must require X-API-Key and return standard error shapes."""
    # 401 Unauthorized when missing API key
    resp_no_key = client.get("/api/v1/alerts")
    assert resp_no_key.status_code == 401
    assert resp_no_key.get_json() == {
        "error": {
            "code": "UNAUTHORIZED",
            "message": "Invalid or missing API key"
        }
    }

    # 404 for non-existent alert ID
    fake_uuid = str(uuid.uuid4())
    resp_404 = client.post(f"/api/v1/alerts/{fake_uuid}/read", headers=auth_headers)
    assert resp_404.status_code == 404
    err_404 = resp_404.get_json()
    assert err_404["error"]["code"] == "ALERT_NOT_FOUND"

    # 404 for malformed UUID
    resp_bad_uuid = client.post("/api/v1/alerts/not-a-uuid/read", headers=auth_headers)
    assert resp_bad_uuid.status_code == 404
    err_bad = resp_bad_uuid.get_json()
    assert err_bad["error"]["code"] == "ALERT_NOT_FOUND"


def test_rate_limiting_ai_routes(client, auth_headers, monkeypatch):
    """AI extract route must enforce rate limiting (30 requests/minute, 429 response)."""
    reset_rate_limits()

    # Mock extraction_service to avoid real Gemini API calls during rate limit testing
    from backend.app.routes import ai
    monkeypatch.setattr(
        ai.extraction_service,
        "extract_from_file",
        lambda file_bytes, filename, media_type: {
            "type": "bill",
            "party_name": "Test",
            "phone": None,
            "amount": 1000,
            "kind": "DR",
            "items": [],
            "confidence": 0.9,
            "raw_text": "sample"
        }
    )

    # Issue 30 allowed requests
    for i in range(30):
        data = {
            "file": (io.BytesIO(b"dummy image data"), f"bill_{i}.jpg"),
            "media_type": "image",
        }
        res = client.post(
            "/api/v1/ai/extract",
            data=data,
            content_type="multipart/form-data",
            headers={"X-API-Key": auth_headers["X-API-Key"]},
        )
        assert res.status_code == 200, f"Request {i+1} failed with status {res.status_code}"

    # 31st request must trigger 429 RATE_LIMIT_EXCEEDED
    data_31 = {
        "file": (io.BytesIO(b"dummy image data"), "bill_31.jpg"),
        "media_type": "image",
    }
    res_429 = client.post(
        "/api/v1/ai/extract",
        data=data_31,
        content_type="multipart/form-data",
        headers={"X-API-Key": auth_headers["X-API-Key"]},
    )
    assert res_429.status_code == 429
    err = res_429.get_json()
    assert err["error"]["code"] == "RATE_LIMIT_EXCEEDED"
    assert "Rate limit exceeded" in err["error"]["message"]

    reset_rate_limits()


def test_upload_size_limit_on_ai_route(client, auth_headers):
    """Files exceeding 10MB on AI route must be rejected with 413 PAYLOAD_TOO_LARGE."""
    reset_rate_limits()
    # 10.5 MB file
    large_payload = b"X" * (10 * 1024 * 1024 + 512 * 1024)
    data = {
        "file": (io.BytesIO(large_payload), "massive_bill.jpg"),
        "media_type": "image",
    }
    res = client.post(
        "/api/v1/ai/extract",
        data=data,
        content_type="multipart/form-data",
        headers={"X-API-Key": auth_headers["X-API-Key"]},
    )
    assert res.status_code == 413
    err = res.get_json()
    assert err["error"]["code"] == "PAYLOAD_TOO_LARGE"
    assert "exceeds maximum limit of 10MB" in err["error"]["message"]


def test_cors_locking_piehost_and_local(client):
    """CORS must allow PieHost web addresses and localhost, and reject unapproved origins."""
    # 1. Allowed PieHost domain
    res_pie = client.options(
        "/api/v1/alerts",
        headers={
            "Origin": "https://piehost.com",
            "Access-Control-Request-Method": "GET",
        }
    )
    assert res_pie.headers.get("Access-Control-Allow-Origin") == "https://piehost.com"

    # 2. Allowed PieHost subdomain
    res_pie_sub = client.options(
        "/api/v1/alerts",
        headers={
            "Origin": "https://dashboard.piehost.com",
            "Access-Control-Request-Method": "GET",
        }
    )
    assert res_pie_sub.headers.get("Access-Control-Allow-Origin") == "https://dashboard.piehost.com"

    # 3. Allowed Localhost dev origin
    res_local = client.options(
        "/api/v1/alerts",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        }
    )
    assert res_local.headers.get("Access-Control-Allow-Origin") == "http://localhost:3000"

    # 4. Disallowed random origin
    res_disallowed = client.options(
        "/api/v1/alerts",
        headers={
            "Origin": "https://unauthorized-domain.com",
            "Access-Control-Request-Method": "GET",
        }
    )
    assert res_disallowed.headers.get("Access-Control-Allow-Origin") is None
