import os
from dotenv import load_dotenv

# Load .env file from backend directory if present
load_dotenv()

class Config:
    """Base application configuration loaded from environment variables."""
    # Database connection string
    # Replace legacy postgres:// with postgresql:// for compatibility with SQLAlchemy/psycopg2
    raw_db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql://quiz_arena:quiz_arena@localhost:5432/billbook"
    )
    if raw_db_url and raw_db_url.startswith("postgres://"):
        raw_db_url = raw_db_url.replace("postgres://", "postgresql://", 1)
    DATABASE_URL = raw_db_url

    # Internal API Key for X-API-Key header verification
    API_KEY = os.environ.get("API_KEY", "billbook-secret-dev-key")

    # Supabase credentials (optional metadata)
    SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

    # Gemini config
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

    # App settings
    ENV = os.environ.get("FLASK_ENV", "development")
    DEBUG = ENV == "development"
    TESTING = False
    PORT = int(os.environ.get("PORT", 5000))


class TestConfig(Config):
    """Testing configuration overriding database for test runs."""
    TESTING = True
    DEBUG = False
    # Use billbook_test database for automated pytest suite
    raw_test_db_url = os.environ.get(
        "TEST_DATABASE_URL",
        "postgresql://quiz_arena:quiz_arena@localhost:5432/billbook_test"
    )
    if raw_test_db_url and raw_test_db_url.startswith("postgres://"):
        raw_test_db_url = raw_test_db_url.replace("postgres://", "postgresql://", 1)
    DATABASE_URL = raw_test_db_url
    API_KEY = "test-api-key"
