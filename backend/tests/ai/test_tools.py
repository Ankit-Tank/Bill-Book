"""
Tests for KhataAI Tools Module.
Verifies the 5 allow-listed tools against the seeded database:
1. get_party_balance
2. list_top_debtors
3. get_period_summary
4. list_overdue_parties
5. get_party_history
"""

import pytest
from backend.app.services.tools import (
    get_party_balance,
    list_top_debtors,
    get_period_summary,
    list_overdue_parties,
    get_party_history,
    format_inr,
)


def test_format_inr():
    assert format_inr(150000) == "₹1,500"
    assert format_inr(240000) == "₹2,400"
    assert format_inr(0) == "₹0"
    assert format_inr(50) == "₹0.50"


def test_get_party_balance_by_name(app):
    with app.app_context():
        res = get_party_balance(party_name="Rahul Sharma")
        assert res["status"] == "success"
        assert res["name"] == "Rahul Sharma"
        assert res["balance"] == 300000  # ₹3,000 in paise
        assert res["formatted_balance"] == "₹3,000"
        assert res["balance_type"] == "receivable"


def test_get_party_balance_by_id(app):
    with app.app_context():
        res = get_party_balance(party_id="f47ac10b-58cc-4372-a567-0e02b2c3d473")
        assert res["status"] == "success"
        assert res["name"] == "Amit Verma"
        assert res["balance"] == 240000  # ₹2,400 in paise
        assert res["formatted_balance"] == "₹2,400"


def test_get_party_balance_supplier(app):
    with app.app_context():
        res = get_party_balance(party_name="Balaji Provisions Distributor")
        assert res["status"] == "success"
        assert res["type"] == "supplier"
        assert res["balance"] == -300000  # -₹3,000
        assert res["balance_type"] == "payable"


def test_get_party_balance_not_found(app):
    with app.app_context():
        res = get_party_balance(party_name="NonExistent Person XYZ")
        assert res["status"] == "not_found"


def test_list_top_debtors(app):
    with app.app_context():
        debtors = list_top_debtors(limit=5)
        assert len(debtors) == 4  # 4 customer debtors in seed data
        # Highest debtor is Rahul Sharma with 300000 paise (₹3,000)
        assert debtors[0]["name"] == "Rahul Sharma"
        assert debtors[0]["balance"] == 300000
        # Second highest is Amit Verma with 240000 paise (₹2,400)
        assert debtors[1]["name"] == "Amit Verma"
        assert debtors[1]["balance"] == 240000
        # Third is Sunita Devi with 165000 paise (₹1,650)
        assert debtors[2]["name"] == "Sunita Devi"
        assert debtors[2]["balance"] == 165000


def test_get_period_summary_today(app):
    with app.app_context():
        summary = get_period_summary(period="today")
        assert summary["period"] == "today"
        assert summary["total_receivable"] == 830000
        assert summary["total_payable"] == 1500000
        assert summary["today_dr"] == 215000
        assert summary["today_cr"] == 120000


def test_list_overdue_parties(app):
    with app.app_context():
        overdue = list_overdue_parties(min_days_overdue=0)
        assert len(overdue) >= 1
        sunita = next((p for p in overdue if "Sunita" in p["party_name"]), None)
        assert sunita is not None
        assert sunita["balance"] == 165000


def test_get_party_history(app):
    with app.app_context():
        history = get_party_history(party_name="Rahul Sharma", limit=5)
        assert history["status"] == "success"
        assert history["party_name"] == "Rahul Sharma"
        assert history["balance"] == 300000
        assert len(history["transactions"]) >= 2
        kinds = [t["kind"] for t in history["transactions"]]
        assert "DR" in kinds
        assert "CR" in kinds

