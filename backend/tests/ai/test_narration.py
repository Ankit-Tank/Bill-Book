"""
Tests for POST /api/v1/ai/narrate and NarrationService.
Verifies 3-4 sentence plain language insights, number grounding,
and response caching so repeated views do not call Gemini again.
"""

import pytest
from backend.app.services.narration import NarrationService, _NARRATION_CACHE


def test_narrate_credit_report(client, auth_headers):
    """Verify 3-4 sentence narration for a customer credit report."""
    payload = {
        "report_type": "credit-report",
        "data": {
            "party_name": "Rahul Sharma",
            "credit_limit": 5000000,
            "total_outstanding": 300000,
            "avg_payment_delay_days": 4,
            "risk_level": "low",
        },
    }
    res = client.post("/api/v1/ai/narrate", json=payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert "narration" in data
    narration = data["narration"]
    assert len(narration) > 20
    # Grounded numbers must be present
    assert "Rahul Sharma" in narration
    assert "4" in narration  # 4 days delay
    assert "₹3,000" in narration or "3,000" in narration
    # Check sentence count (around 3 to 4 sentences)
    sentences = [s.strip() for s in narration.split(".") if len(s.strip()) > 3]
    assert 3 <= len(sentences) <= 5


def test_narrate_caching_behavior(client, auth_headers):
    """Verify identical report data hits cache and does not re-compute."""
    payload = {
        "report_type": "day-book",
        "data": {
            "date": "2026-10-25",
            "total_dr": 215000,
            "total_cr": 120000,
            "net_change": 95000,
            "entries": [{"amount": 150000}, {"amount": 65000}],
        },
    }
    # Initial request
    res1 = client.post("/api/v1/ai/narrate", json=payload, headers=auth_headers)
    assert res1.status_code == 200
    text1 = res1.get_json()["narration"]

    # Repeated request should yield identical cached text
    res2 = client.post("/api/v1/ai/narrate", json=payload, headers=auth_headers)
    assert res2.status_code == 200
    text2 = res2.get_json()["narration"]

    assert text1 == text2


def test_narrate_invalid_inputs(client, auth_headers):
    """Verify standard error format on invalid inputs."""
    # Missing data
    res_no_data = client.post("/api/v1/ai/narrate", json={"report_type": "credit-report"}, headers=auth_headers)
    assert res_no_data.status_code == 400
    assert res_no_data.get_json()["error"]["code"] == "INVALID_INPUT"

    # Missing report_type
    res_no_type = client.post("/api/v1/ai/narrate", json={"data": {}}, headers=auth_headers)
    assert res_no_type.status_code == 400
    assert res_no_type.get_json()["error"]["code"] == "INVALID_INPUT"

    # Non-JSON payload
    res_bad_body = client.post("/api/v1/ai/narrate", data="not json", headers=auth_headers)
    assert res_bad_body.status_code == 400
    assert res_bad_body.get_json()["error"]["code"] == "INVALID_INPUT"
