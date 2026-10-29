#!/usr/bin/env python3
"""BillBook Data Eraser Script.

Safely clears all demo/sample parties, transactions, alerts, and AI messages
from the database so the application starts from a completely clean state.
Can be re-seeded at any time using:
    python backend/scripts/seed_demo.py
"""

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent
sys.path.insert(0, str(REPO_ROOT))

from backend.app import create_app
from backend.app.db import execute, query_all


def clear_all_data():
    """Clear all records from transactional tables."""
    app = create_app()
    with app.app_context():
        print("=" * 60)
        print("Cleaning BillBook Database...")
        print("=" * 60)

        # Pre-check counts
        parties_before = query_all("SELECT COUNT(*) AS c FROM parties;")[0]["c"]
        txns_before = query_all("SELECT COUNT(*) AS c FROM transactions;")[0]["c"]
        alerts_before = query_all("SELECT COUNT(*) AS c FROM alerts;")[0]["c"]
        print(f"Before: {parties_before} parties, {txns_before} transactions, {alerts_before} alerts.")

        # Truncate tables with foreign key cascade
        execute("TRUNCATE TABLE transactions CASCADE;")
        execute("TRUNCATE TABLE alerts CASCADE;")
        execute("TRUNCATE TABLE ai_messages CASCADE;")
        execute("TRUNCATE TABLE parties CASCADE;")

        # Post-check counts
        parties_after = query_all("SELECT COUNT(*) AS c FROM parties;")[0]["c"]
        txns_after = query_all("SELECT COUNT(*) AS c FROM transactions;")[0]["c"]
        alerts_after = query_all("SELECT COUNT(*) AS c FROM alerts;")[0]["c"]
        print(f"After: {parties_after} parties, {txns_after} transactions, {alerts_after} alerts.")
        print("Database successfully cleared! BillBook is now a clean slate.")


if __name__ == "__main__":
    clear_all_data()
