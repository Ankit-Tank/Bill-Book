def test_dashboard_summary_seed_hand_calculation(client, auth_headers):
    """
    Test that the initial seeded demo shop matches hand calculations:
    - Rahul Sharma:   0 + 400000 - 100000 = +300000 (Receivable)
    - Priya Patel:    50000 + 205000 - 130000 = +125000 (Receivable)
    - Amit Verma:     0 + 340000 - 100000 = +240000 (Receivable)
    - Sunita Devi:    100000 + 165000 - 100000 = +165000 (Receivable)
    Total Receivable = 300000 + 125000 + 240000 + 165000 = 830000

    - Kisan Wholesale:  -500000 + 200000 - 900000 = -1200000 (Payable 1200000)
    - Balaji Provisions: 0 + 150000 - 450000 = -300000 (Payable 300000)
    Total Payable = 1200000 + 300000 = 1500000

    Net Balance = 830000 - 1500000 = -670000

    Today DR = Txn 1 (150000) + Txn 3 (65000) = 215000
    Today CR = Txn 2 (80000) + Txn 4 (40000) = 120000
    """
    res = client.get("/api/v1/dashboard/summary", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()

    assert data["total_receivable"] == 830000
    assert data["total_payable"] == 1500000
    assert data["net_balance"] == -670000
    assert data["today_dr"] == 215000
    assert data["today_cr"] == 120000
    assert len(data["recent_transactions"]) == 10


def test_dashboard_summary_after_creating_party_and_transactions(client, auth_headers):
    """
    Verify creating a party and transactions updates dashboard summary
    identically to a manual hand calculation.
    """
    # 1. Create a new customer party with opening balance of 100,000 paise (Rs 1,000)
    party_res = client.post(
        "/api/v1/parties",
        json={
            "name": "Ganesh Supermarket",
            "phone": "+919777666555",
            "type": "customer",
            "opening_balance": 100000,
            "credit_limit": 5000000,
            "due_days": 30,
        },
        headers=auth_headers,
    )
    assert party_res.status_code == 201
    party_id = party_res.get_json()["id"]

    # Hand calculation check after party creation:
    # total_receivable = 830000 + 100000 = 930000
    # total_payable = 1500000
    # net_balance = 930000 - 1500000 = -570000
    summary_1 = client.get("/api/v1/dashboard/summary", headers=auth_headers).get_json()
    assert summary_1["total_receivable"] == 930000
    assert summary_1["total_payable"] == 1500000
    assert summary_1["net_balance"] == -570000

    # 2. Add a credit sale (DR) today for Ganesh: 50,000 paise
    dr_res = client.post(
        "/api/v1/transactions",
        json={
            "party_id": party_id,
            "kind": "DR",
            "amount": 50000,
            "particulars": "Special basmati rice supply",
            "source": "manual",
        },
        headers=auth_headers,
    )
    assert dr_res.status_code == 201

    # Hand calculation check:
    # total_receivable = 930000 + 50000 = 980000
    # net_balance = 980000 - 1500000 = -520000
    # today_dr = 215000 + 50000 = 265000
    summary_2 = client.get("/api/v1/dashboard/summary", headers=auth_headers).get_json()
    assert summary_2["total_receivable"] == 980000
    assert summary_2["total_payable"] == 1500000
    assert summary_2["net_balance"] == -520000
    assert summary_2["today_dr"] == 265000
    assert summary_2["today_cr"] == 120000

    # 3. Add a payment received (CR) today from Ganesh: 20,000 paise
    cr_res = client.post(
        "/api/v1/transactions",
        json={
            "party_id": party_id,
            "kind": "CR",
            "amount": 20000,
            "particulars": "UPI partial payment",
            "source": "manual",
        },
        headers=auth_headers,
    )
    assert cr_res.status_code == 201

    # Hand calculation check:
    # Ganesh balance = 100000 + 50000 - 20000 = 130000
    # total_receivable = 830000 + 130000 = 960000
    # total_payable = 1500000
    # net_balance = 960000 - 1500000 = -540000
    # today_dr = 265000
    # today_cr = 120000 + 20000 = 140000
    summary_3 = client.get("/api/v1/dashboard/summary", headers=auth_headers).get_json()
    assert summary_3["total_receivable"] == 960000
    assert summary_3["total_payable"] == 1500000
    assert summary_3["net_balance"] == -540000
    assert summary_3["today_dr"] == 265000
    assert summary_3["today_cr"] == 140000

    # Ensure recent transactions list has the new transactions at top
    recent_ids = [t["party_id"] for t in summary_3["recent_transactions"][:2]]
    assert party_id in recent_ids
