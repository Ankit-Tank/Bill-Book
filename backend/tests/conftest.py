import os
import sys
import pytest
from pathlib import Path

# Add project root and backend to sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT))

from backend.app import create_app
from backend.app.config import TestConfig
from backend.app.db import get_db, close_db_pool, execute


@pytest.fixture(scope="session")
def app():
    """Create Flask test app configured with TestConfig."""
    app = create_app(TestConfig)
    yield app
    with app.app_context():
        close_db_pool()


@pytest.fixture(scope="session")
def client(app):
    """Test client for API requests."""
    return app.test_client()


@pytest.fixture
def auth_headers():
    """Valid authorization headers for test requests."""
    return {
        "X-API-Key": "test-api-key",
        "Content-Type": "application/json",
    }


@pytest.fixture(autouse=True)
def reset_db_data(app):
    """Reset test database to known seed state before each test."""
    with app.app_context():
        seed_path = REPO_ROOT / "supabase" / "seed.sql"
        if seed_path.exists():
            seed_sql = seed_path.read_text()
            conn = get_db()
            with conn.cursor() as cur:
                cur.execute(seed_sql)
            conn.commit()
    yield
