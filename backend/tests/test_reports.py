"""Unit and integration tests for Business Reports API.

Tests:
- GET /reports/day-book (JSON and ?format=csv)
- GET /reports/outstanding (JSON and ?format=csv)
- GET /reports/payables (JSON and ?format=csv)
- GET /reports/collection (JSON and ?format=csv)
- GET /reports/weekly (JSON and ?format=csv)
- GET /reports/monthly (JSON and ?format=csv)
- Hand-calculated totals matching seed scenario
- CSV structure and Excel compatibility
- Validation error handling (400 INVALID_INPUT)
- Auth protection (401 UNAUTHORIZED)
"""

import csv
import io
import datetime
import pytest


# ============================================================================
# 1. Day Book Report Tests
# ============================================================================

def test_day_book_today_json(client, auth_headers):
    """Verify Day Book for today returns today's seed transactions."""
    res = client.get("/api/v1/reports/day-book", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()

    assert data["date"] == datetime.date.today().isoformat()
    # In seed data, today has:
    # Txn 1: Rahul DR 150000
    # Txn 2: Priya CR 80000
    # Txn 3: Amit DR 65000
    # Txn 4: Sunita CR 40000
    assert data["total_dr"] == 215000  # 150000 + 65000
    assert data["total_cr"] == 120000  # 80000 + 40000
    assert data["net_change"] == 95000  # 215000 - 120000
    assert len(data["entries"]) == 4


def test_day_book_csv_export(client, auth_headers):
    """Verify Day Book CSV export returns valid CSV with Excel BOM and correct headers."""
    res = client.get("/api/v1/reports/day-book?format=csv", headers=auth_headers)
    assert res.status_code == 200
    assert "text/csv" in res.headers["Content-Type"]
    assert "attachment; filename=\"day-book-" in res.headers["Content-Disposition"]

    content = res.get_data(as_text=True)
    # Check UTF-8 BOM
    assert content.startswith("\ufeff")
    clean_csv = content.lstrip("\ufeff")

    reader = list(csv.reader(io.StringIO(clean_csv)))
    assert len(reader) >= 6  # Title, totals, blank line, header, 4 entries
    # Header row is after blank line (index 5)
    headers = reader[5]
    assert headers == ["Transaction ID", "Party ID", "Party Name", "Kind", "Amount (Paise)", "Amount (INR)", "Particulars", "Created At"]


def test_day_book_invalid_date(client, auth_headers):
    """Verify 400 INVALID_INPUT on invalid date format."""
    res = client.get("/api/v1/reports/day-book?date=not-a-date", headers=auth_headers)
    assert res.status_code == 400
    err = res.get_json()["error"]
    assert err["code"] == "INVALID_INPUT"


# ============================================================================
# 2. Outstanding Report Tests (Receivables)
# ============================================================================

def test_outstanding_report_json(client, auth_headers):
    """Verify Outstanding report matches hand-calculated figures on seed data."""
    res = client.get("/api/v1/reports/outstanding", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()

    # Seed data has 4 customers with positive balances:
    # Rahul: 300000, Amit: 240000, Sunita: 165000, Priya: 125000
    assert data["parties_count"] == 4
    assert data["total_outstanding"] == 830000

    parties = data["parties"]
    # Check ordering by balance descending
    assert parties[0]["party_name"] == "Rahul Sharma"
    assert parties[0]["balance"] == 300000
    assert parties[1]["party_name"] == "Amit Verma"
    assert parties[1]["balance"] == 240000
    assert parties[2]["party_name"] == "Sunita Devi"
    assert parties[2]["balance"] == 165000
    assert parties[3]["party_name"] == "Priya Patel"
    assert parties[3]["balance"] == 125000


def test_outstanding_report_csv(client, auth_headers):
    """Verify Outstanding report CSV opens cleanly with RFC 4180 format."""
    res = client.get("/api/v1/reports/outstanding?format=csv", headers=auth_headers)
    assert res.status_code == 200
    assert "text/csv" in res.headers["Content-Type"]
    assert "attachment; filename=\"outstanding-receivables.csv\"" in res.headers["Content-Disposition"]

    content = res.get_data(as_text=True).lstrip("\ufeff")
    reader = list(csv.reader(io.StringIO(content)))
    assert len(reader) == 10  # Title, total paise, total inr, count, blank, headers, 4 parties
    assert reader[5] == ["Party ID", "Party Name", "Phone", "Balance (Paise)", "Balance (INR)", "Due Days", "Overdue Days"]


# ============================================================================
# 3. Payables Report Tests
# ============================================================================

def test_payables_report_json(client, auth_headers):
    """Verify Payables report matches hand-calculated figures for suppliers."""
    res = client.get("/api/v1/reports/payables", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()

    # Seed data suppliers:
    # Kisan: -1200000, Balaji: -300000
    # Total payable = 1200000 + 300000 = 1500000
    assert data["suppliers_count"] == 2
    assert data["total_payable"] == 1500000

    parties = data["parties"]
    assert parties[0]["party_name"] == "Kisan Wholesale Traders"
    assert parties[0]["balance"] == -1200000
    assert parties[1]["party_name"] == "Balaji Provisions Distributor"
    assert parties[1]["balance"] == -300000


def test_payables_report_csv(client, auth_headers):
    """Verify Payables report CSV format."""
    res = client.get("/api/v1/reports/payables?format=csv", headers=auth_headers)
    assert res.status_code == 200
    assert "attachment; filename=\"payables.csv\"" in res.headers["Content-Disposition"]

    content = res.get_data(as_text=True).lstrip("\ufeff")
    reader = list(csv.reader(io.StringIO(content)))
    assert reader[5] == ["Party ID", "Party Name", "Phone", "Balance (Paise)", "Balance (INR)", "Due Days"]
    assert len(reader) == 8  # 4 summary lines + 1 blank + 1 header + 2 suppliers


# ============================================================================
# 4. Collection Report Tests
# ============================================================================

def test_collection_report_json(client, auth_headers):
    """Verify Collection report across 30 days window."""
    res = client.get("/api/v1/reports/collection", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()

    assert data["total_collected"] > 0
    assert data["collections_count"] > 0
    assert len(data["daily_breakdown"]) > 0

    # Test with custom date range
    start = (datetime.date.today() - datetime.timedelta(days=5)).isoformat()
    end = datetime.date.today().isoformat()
    range_res = client.get(f"/api/v1/reports/collection?start_date={start}&end_date={end}", headers=auth_headers)
    assert range_res.status_code == 200
    range_data = range_res.get_json()
    assert range_data["start_date"] == start
    assert range_data["end_date"] == end


def test_collection_report_csv(client, auth_headers):
    """Verify Collection report CSV format."""
    res = client.get("/api/v1/reports/collection?format=csv", headers=auth_headers)
    assert res.status_code == 200
    content = res.get_data(as_text=True).lstrip("\ufeff")
    reader = list(csv.reader(io.StringIO(content)))
    assert reader[5] == ["Date", "Amount (Paise)", "Amount (INR)", "Count"]



# ============================================================================
# 5. Weekly Summary Report Tests
# ============================================================================

def test_weekly_report_json(client, auth_headers):
    """Verify Weekly report totals, growth percentage, and top debtors."""
    res = client.get("/api/v1/reports/weekly", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()

    assert "week_start" in data
    assert "week_end" in data
    assert isinstance(data["sales_total"], int)
    assert isinstance(data["collections_total"], int)
    assert data["net_change"] == data["sales_total"] - data["collections_total"]
    assert isinstance(data["sales_growth_percent"], (int, float))

    # Top debtors (max 5)
    assert len(data["top_debtors"]) <= 5
    assert len(data["top_debtors"]) == 4
    assert data["top_debtors"][0]["name"] == "Rahul Sharma"
    assert data["top_debtors"][0]["balance"] == 300000


def test_weekly_report_csv(client, auth_headers):
    """Verify Weekly report CSV format with summary and top debtors sections."""
    res = client.get("/api/v1/reports/weekly?format=csv", headers=auth_headers)
    assert res.status_code == 200
    content = res.get_data(as_text=True).lstrip("\ufeff")
    reader = list(csv.reader(io.StringIO(content)))
    # Check that Top Debtors section header exists
    assert any("Top Debtors" in row for row in reader)


# ============================================================================
# 6. Monthly Summary Report Tests
# ============================================================================

def test_monthly_report_json(client, auth_headers):
    """Verify Monthly report totals and month-over-month comparisons."""
    curr_month = datetime.date.today().strftime("%Y-%m")
    res = client.get(f"/api/v1/reports/monthly?month={curr_month}", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()

    assert data["month"] == curr_month
    assert isinstance(data["sales_total"], int)
    assert isinstance(data["collections_total"], int)
    assert data["net_change"] == data["sales_total"] - data["collections_total"]
    assert "previous_month_comparison" in data
    assert "sales_growth_percent" in data["previous_month_comparison"]
    assert "collections_growth_percent" in data["previous_month_comparison"]
    assert len(data["top_debtors"]) == 4


def test_monthly_report_csv(client, auth_headers):
    """Verify Monthly report CSV format."""
    res = client.get("/api/v1/reports/monthly?format=csv", headers=auth_headers)
    assert res.status_code == 200
    content = res.get_data(as_text=True).lstrip("\ufeff")
    reader = list(csv.reader(io.StringIO(content)))
    assert any("Monthly Summary Report" in row for row in reader)
    assert any("Top Debtors" in row for row in reader)


def test_monthly_report_invalid_month(client, auth_headers):
    """Verify 400 INVALID_INPUT for bad month string."""
    res = client.get("/api/v1/reports/monthly?month=bad-month", headers=auth_headers)
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "INVALID_INPUT"


# ============================================================================
# 7. Authentication Protection Tests
# ============================================================================

@pytest.mark.parametrize("endpoint", [
    "/api/v1/reports/day-book",
    "/api/v1/reports/outstanding",
    "/api/v1/reports/payables",
    "/api/v1/reports/collection",
    "/api/v1/reports/weekly",
    "/api/v1/reports/monthly",
])
def test_reports_require_auth(client, endpoint):
    """Verify all report routes require valid X-API-Key."""
    res = client.get(endpoint)
    assert res.status_code == 401
    assert res.get_json()["error"]["code"] == "UNAUTHORIZED"
