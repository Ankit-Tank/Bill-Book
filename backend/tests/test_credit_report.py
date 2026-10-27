"""Unit and integration tests for Credit Management API.

Tests:
- Hand-calculated credit report values on seed data (Rahul, Priya, Amit, Sunita)
- FIFO payment delay and aging bucket calculation
- Rule-based risk level assessment (low, moderate, high)
- Editable credit_limit and due_days on parties (PATCH)
- Error handling (404 party not found, 401 unauthorized)
"""

import datetime
import pytest


def test_credit_report_rahul_sharma(client, auth_headers):
    """Verify hand-calculated credit report for Rahul Sharma."""
    party_id = "f47ac10b-58cc-4372-a567-0e02b2c3d471"
    res = client.get(f"/api/v1/parties/{party_id}/credit-report", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()

    assert data["party_id"] == party_id
    assert data["party_name"] == "Rahul Sharma"
    assert data["credit_limit"] == 5000000
    assert data["total_outstanding"] == 300000  # 400000 DR - 100000 CR
    assert data["limit_usage_percent"] == 6.0   # 300000 / 5000000 * 100
    assert data["avg_payment_delay_days"] == 0  # CR on CURRENT_DATE - 3, due CURRENT_DATE + 25 (28 days early)
    assert data["aging_buckets"] == {
        "days_0_30": 300000,
        "days_31_60": 0,
        "days_60_plus": 0,
    }
    assert data["last_payment_date"] == (datetime.date.today() - datetime.timedelta(days=3)).isoformat()
    assert data["last_payment_amount"] == 100000
    assert data["risk_level"] == "low"


def test_credit_report_sunita_devi_fifo_delay(client, auth_headers):
    """Verify hand-calculated FIFO delay for Sunita Devi with overdue payments."""
    party_id = "f47ac10b-58cc-4372-a567-0e02b2c3d474"
    res = client.get(f"/api/v1/parties/{party_id}/credit-report", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()

    assert data["party_id"] == party_id
    assert data["party_name"] == "Sunita Devi"
    assert data["credit_limit"] == 1500000
    assert data["total_outstanding"] == 165000
    assert data["limit_usage_percent"] == 11.0
    assert data["avg_payment_delay_days"] == 8  # 60k delay 2d, 40k delay 17d = 8d weighted average
    assert data["aging_buckets"] == {
        "days_0_30": 165000,
        "days_31_60": 0,
        "days_60_plus": 0,
    }
    assert data["last_payment_date"] == datetime.date.today().isoformat()
    assert data["last_payment_amount"] == 40000
    assert data["risk_level"] == "low"


def test_credit_report_amit_verma(client, auth_headers):
    """Verify hand-calculated credit report for Amit Verma."""
    party_id = "f47ac10b-58cc-4372-a567-0e02b2c3d473"
    res = client.get(f"/api/v1/parties/{party_id}/credit-report", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()

    assert data["party_id"] == party_id
    assert data["party_name"] == "Amit Verma"
    assert data["credit_limit"] == 2000000
    assert data["total_outstanding"] == 240000
    assert data["limit_usage_percent"] == 12.0
    assert data["avg_payment_delay_days"] == 0
    assert data["aging_buckets"] == {
        "days_0_30": 240000,
        "days_31_60": 0,
        "days_60_plus": 0,
    }
    assert data["last_payment_date"] == (datetime.date.today() - datetime.timedelta(days=14)).isoformat()
    assert data["last_payment_amount"] == 100000
    assert data["risk_level"] == "low"


def test_credit_report_priya_patel(client, auth_headers):
    """Verify hand-calculated credit report for Priya Patel."""
    party_id = "f47ac10b-58cc-4372-a567-0e02b2c3d472"
    res = client.get(f"/api/v1/parties/{party_id}/credit-report", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()

    assert data["party_id"] == party_id
    assert data["party_name"] == "Priya Patel"
    assert data["credit_limit"] == 3000000
    assert data["total_outstanding"] == 125000
    assert data["limit_usage_percent"] == 4.2
    assert data["avg_payment_delay_days"] == 1
    assert data["aging_buckets"] == {
        "days_0_30": 125000,
        "days_31_60": 0,
        "days_60_plus": 0,
    }
    assert data["last_payment_date"] == datetime.date.today().isoformat()
    assert data["last_payment_amount"] == 80000
    assert data["risk_level"] == "low"


def test_patch_party_credit_limit_and_due_days(client, auth_headers):
    """Verify credit_limit and due_days are editable on parties (PATCH) and reflect in report."""
    party_id = "f47ac10b-58cc-4372-a567-0e02b2c3d471"
    
    # 1. Update credit limit to 400,000 paise (4,000 INR) and due_days to 10
    patch_res = client.patch(
        f"/api/v1/parties/{party_id}",
        headers=auth_headers,
        json={"credit_limit": 400000, "due_days": 10},
    )
    assert patch_res.status_code == 200
    party_data = patch_res.get_json()
    assert party_data["credit_limit"] == 400000
    assert party_data["due_days"] == 10

    # 2. Check credit report reflects the new limit and recalculates usage percent and risk level
    # 300000 balance / 400000 limit = 75.0% usage -> risk_level becomes 'moderate'
    report_res = client.get(f"/api/v1/parties/{party_id}/credit-report", headers=auth_headers)
    assert report_res.status_code == 200
    report_data = report_res.get_json()
    assert report_data["credit_limit"] == 400000
    assert report_data["limit_usage_percent"] == 75.0
    assert report_data["risk_level"] == "moderate"


def test_credit_report_high_risk_scenario(client, auth_headers):
    """Create a party with high credit limit usage (>85%) and verify risk_level = 'high'."""
    # Create party with 100,000 paise credit limit
    create_res = client.post(
        "/api/v1/parties",
        headers=auth_headers,
        json={
            "name": "High Risk Customer",
            "phone": "+919999000011",
            "type": "customer",
            "opening_balance": 90000,  # 90% of credit limit
            "credit_limit": 100000,
            "due_days": 15,
        },
    )
    assert create_res.status_code == 201
    new_id = create_res.get_json()["id"]

    report_res = client.get(f"/api/v1/parties/{new_id}/credit-report", headers=auth_headers)
    assert report_res.status_code == 200
    report = report_res.get_json()
    assert report["total_outstanding"] == 90000
    assert report["limit_usage_percent"] == 90.0
    assert report["risk_level"] == "high"


def test_credit_report_party_not_found(client, auth_headers):
    """Test 404 PARTY_NOT_FOUND when party ID does not exist."""
    random_uuid = "00000000-0000-0000-0000-000000000000"
    res = client.get(f"/api/v1/parties/{random_uuid}/credit-report", headers=auth_headers)
    assert res.status_code == 404
    err = res.get_json()["error"]
    assert err["code"] == "PARTY_NOT_FOUND"


def test_credit_report_invalid_uuid(client, auth_headers):
    """Test 404 PARTY_NOT_FOUND when party ID is malformed."""
    res = client.get("/api/v1/parties/not-a-valid-uuid/credit-report", headers=auth_headers)
    assert res.status_code == 404
    err = res.get_json()["error"]
    assert err["code"] == "PARTY_NOT_FOUND"


def test_credit_report_unauthorized(client):
    """Test 401 UNAUTHORIZED when X-API-Key is missing."""
    party_id = "f47ac10b-58cc-4372-a567-0e02b2c3d471"
    res = client.get(f"/api/v1/parties/{party_id}/credit-report")
    assert res.status_code == 401
    assert res.get_json()["error"]["code"] == "UNAUTHORIZED"
