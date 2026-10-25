#!/usr/bin/env python3
"""BillBook Demo Shop Seeder (Phase 8: Alerts Engine Hardening).

Creates a demo shop in the database with parties and transactions that
intentionally and realistically trigger all 5 alert types:
1. overdue: Unpaid DR past party's due_days
2. credit_limit_exceeded: Outstanding balance exceeds credit_limit
3. duplicate_bill: Same party & amount within 24 hours
4. unusual_amount: Transaction > 3x median (with at least 5 transactions)
5. repeat_late_payer: Customer with multiple late payments past due dates

Usage:
    python backend/scripts/seed_demo.py
"""

import os
import sys
import datetime
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent
sys.path.insert(0, str(REPO_ROOT))

from backend.app import create_app
from backend.app.db import execute, execute_returning, query_all
from backend.app.services.alerts import evaluate_all_alerts


def seed_demo_shop():
    """Populate database with demo parties and transactions that trigger every alert type."""
    app = create_app()
    with app.app_context():
        print("=" * 70)
        print("🌱 Seeding BillBook Demo Shop with Alert-Triggering Scenarios...")
        print("=" * 70)

        # Clear existing transactions and alerts for demo isolation
        execute("TRUNCATE TABLE transactions CASCADE;")
        execute("TRUNCATE TABLE alerts CASCADE;")
        execute("TRUNCATE TABLE parties CASCADE;")

        today = datetime.date.today()

        # =====================================================================
        # 1. Party: Overdue Alert Trigger
        # =====================================================================
        # Customer: Ramesh Kumar (due_days: 7, credit_limit: ₹10,000)
        # DR of ₹1,200 from 25 days ago (18 days overdue!)
        p1 = execute_returning("""
            INSERT INTO parties (name, phone, type, opening_balance, credit_limit, due_days, status)
            VALUES ('Ramesh Kumar', '+919811001122', 'customer', 0, 1000000, 7, 'active')
            RETURNING id;
        """)["id"]

        execute("""
            INSERT INTO transactions (party_id, kind, amount, txn_date, particulars, source, created_at)
            VALUES (%s, 'DR', 120000, %s, 'Ghee 2kg and Basmati Rice 10kg', 'manual', now() - interval '25 days');
        """, (p1, today - datetime.timedelta(days=25)))
        print(f"  ✓ Created party 'Ramesh Kumar' (Overdue DR 18 days past 7-day limit)")

        # =====================================================================
        # 2. Party: Credit Limit Exceeded Trigger
        # =====================================================================
        # Customer: Kavita Verma (credit_limit: ₹5,000, balance: ₹8,500)
        p2 = execute_returning("""
            INSERT INTO parties (name, phone, type, opening_balance, credit_limit, due_days, status)
            VALUES ('Kavita Verma', '+919822002233', 'customer', 0, 500000, 30, 'active')
            RETURNING id;
        """)["id"]

        execute("""
            INSERT INTO transactions (party_id, kind, amount, txn_date, particulars, source, created_at)
            VALUES (%s, 'DR', 850000, %s, 'Dry Fruits & Spices Bulk Order', 'photo', now() - interval '2 days');
        """, (p2, today - datetime.timedelta(days=2)))
        print(f"  ✓ Created party 'Kavita Verma' (Balance ₹8,500 exceeds ₹5,000 credit limit)")

        # =====================================================================
        # 3. Party: Duplicate Bill Trigger
        # =====================================================================
        # Customer: Suresh Traders (same amount ₹2,500 recorded within 24 hours)
        p3 = execute_returning("""
            INSERT INTO parties (name, phone, type, opening_balance, credit_limit, due_days, status)
            VALUES ('Suresh Traders', '+919833003344', 'customer', 0, 2000000, 15, 'active')
            RETURNING id;
        """)["id"]

        execute("""
            INSERT INTO transactions (party_id, kind, amount, txn_date, particulars, source, created_at)
            VALUES (%s, 'DR', 250000, %s, '5 Bags Refined Sugar 50kg', 'manual', now() - interval '4 hours');
        """, (p3, today))

        execute("""
            INSERT INTO transactions (party_id, kind, amount, txn_date, particulars, source, created_at)
            VALUES (%s, 'DR', 250000, %s, '5 Bags Refined Sugar 50kg (Duplicate)', 'photo', now() - interval '1 hour');
        """, (p3, today))
        print(f"  ✓ Created party 'Suresh Traders' (Two identical ₹2,500 bills in 4 hours)")

        # =====================================================================
        # 4. Party: Unusual Amount Trigger (> 3x median with >= 5 transactions)
        # =====================================================================
        # Customer: Anand Dairy (5 normal transactions ~₹200-₹400, 1 spike of ₹3,000)
        p4 = execute_returning("""
            INSERT INTO parties (name, phone, type, opening_balance, credit_limit, due_days, status)
            VALUES ('Anand Dairy', '+919844004455', 'customer', 0, 5000000, 30, 'active')
            RETURNING id;
        """)["id"]

        normal_amounts = [20000, 25000, 30000, 35000, 40000]  # Median is 30,000 (₹300)
        for i, amt in enumerate(normal_amounts):
            execute("""
                INSERT INTO transactions (party_id, kind, amount, txn_date, particulars, source, created_at)
                VALUES (%s, 'DR', %s, %s, %s, 'manual', now() - interval '%s days');
            """, (p4, amt, today - datetime.timedelta(days=10 - i), f"Daily dairy supplies #{i+1}", 10 - i))

        # Outlier spike of ₹3,000 (300,000 paise = 10x median!)
        execute("""
            INSERT INTO transactions (party_id, kind, amount, txn_date, particulars, source, created_at)
            VALUES (%s, 'DR', 300000, %s, 'Commercial Deep Freezer Restock', 'manual', now() - interval '1 day');
        """, (p4, today - datetime.timedelta(days=1)))
        print(f"  ✓ Created party 'Anand Dairy' (5 baseline txns, spike of ₹3,000 > 3x median)")

        # =====================================================================
        # 5. Party: Repeat Late Payer Trigger
        # =====================================================================
        # Customer: Deepak Kirana (7 day credit period, multiple late payments)
        p5 = execute_returning("""
            INSERT INTO parties (name, phone, type, opening_balance, credit_limit, due_days, status)
            VALUES ('Deepak Kirana', '+919855005566', 'customer', 0, 2000000, 7, 'active')
            RETURNING id;
        """)["id"]

        # Bill 1 (DR 100000 on T-35, due T-28). Paid on T-15 (13 days late!)
        execute("""
            INSERT INTO transactions (party_id, kind, amount, txn_date, particulars, source, created_at)
            VALUES (%s, 'DR', 100000, %s, 'Invoice #DK-101 Cooking Oil', 'manual', now() - interval '35 days');
        """, (p5, today - datetime.timedelta(days=35)))
        execute("""
            INSERT INTO transactions (party_id, kind, amount, txn_date, particulars, source, created_at)
            VALUES (%s, 'CR', 100000, %s, 'UPI Settlement (Late)', 'manual', now() - interval '15 days');
        """, (p5, today - datetime.timedelta(days=15)))

        # Bill 2 (DR 80000 on T-20, due T-13). Paid on T-1 (12 days late!)
        execute("""
            INSERT INTO transactions (party_id, kind, amount, txn_date, particulars, source, created_at)
            VALUES (%s, 'DR', 80000, %s, 'Invoice #DK-102 Pulses', 'manual', now() - interval '20 days');
        """, (p5, today - datetime.timedelta(days=20)))
        execute("""
            INSERT INTO transactions (party_id, kind, amount, txn_date, particulars, source, created_at)
            VALUES (%s, 'CR', 80000, %s, 'Cash Settlement (Late)', 'manual', now() - interval '1 day');
        """, (p5, today - datetime.timedelta(days=1)))
        print(f"  ✓ Created party 'Deepak Kirana' (2 repeated payments averaging 12+ days late)")

        # =====================================================================
        # Evaluate All Rules
        # =====================================================================
        print("\n⚡ Running Alerts Evaluation Engine...")
        eval_result = evaluate_all_alerts()
        print(f"  Triggered: {eval_result['triggered_count']} alerts across {eval_result['evaluated_rules']} rules.\n")

        # Fetch and display triggered alerts
        alerts = query_all("""
            SELECT a.kind, a.severity, p.name AS party_name, a.message, a.dedupe_key
            FROM alerts a
            JOIN parties p ON a.party_id = p.id
            ORDER BY a.created_at ASC;
        """)

        print("=" * 80)
        print(f"{'KIND':<24} | {'SEVERITY':<10} | {'PARTY':<16} | {'MESSAGE'}")
        print("-" * 80)
        for a in alerts:
            print(f"{a['kind']:<24} | {a['severity']:<10} | {a['party_name']:<16} | {a['message']}")
        print("=" * 80)
        print(f"✅ Demo Shop Seeding Complete. {len(alerts)} alerts actively stored.")


if __name__ == "__main__":
    seed_demo_shop()
