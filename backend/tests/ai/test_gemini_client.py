import os
import pytest

try:
    from app.services.gemini_client import GeminiClient
except ImportError:
    from backend.app.services.gemini_client import GeminiClient


def test_gemini_client_defaults():
    """Verify GeminiClient reads default configuration."""
    client = GeminiClient(api_key="custom-key", model="gemini-2.5-flash", timeout=15.0, max_retries=1)
    assert client.api_key == "custom-key"
    assert client.model == "gemini-2.5-flash"
    assert client.timeout == 15.0
    assert client.max_retries == 1
    assert client.is_configured() is True


def test_gemini_client_unconfigured():
    """Verify placeholder key is treated as unconfigured."""
    client = GeminiClient(api_key="your-gemini-api-key")
    assert client.is_configured() is False


def test_gemini_client_fallback_execution():
    """Verify fallback executes deterministically when unconfigured."""
    client = GeminiClient(api_key="")
    sample_bytes = b"Customer: Rahul Sharma\nTotal: Rs 2,500.00\nDate: 2026-10-25"
    res = client.generate_content("Extract bill", media_bytes=sample_bytes, mime_type="image/jpeg")
    assert "250000" in res
    assert "Rahul Sharma" in res
