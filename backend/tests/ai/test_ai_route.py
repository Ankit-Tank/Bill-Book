import io
import pytest

try:
    from app.routes.ai import create_ai_app
except ImportError:
    from backend.app.routes.ai import create_ai_app


@pytest.fixture
def client():
    app = create_ai_app()
    app.config["TESTING"] = True
    return app.test_client()


def test_ai_extract_image_success(client):
    """Test POST /api/v1/ai/extract with multipart image upload."""
    data = {
        "media_type": "image",
        "file": (io.BytesIO(b"INVOICE\nCustomer: Rahul Sharma\nDate: 2026-10-24\nTotal: Rs 2,500.00\nDR"), "bill.jpg"),
    }
    res = client.post("/api/v1/ai/extract", data=data, content_type="multipart/form-data")
    assert res.status_code == 200
    res_data = res.get_json()

    assert res_data["party_name"] == "Rahul Sharma"
    assert res_data["kind"] == "DR"
    assert res_data["amount"] == 250000
    assert res_data["txn_date"] == "2026-10-24"
    assert "party_candidates" in res_data
    assert "needs_review_fields" in res_data
    assert "confidence" in res_data


def test_ai_extract_audio_success(client):
    """Test POST /api/v1/ai/extract with multipart audio upload."""
    data = {
        "media_type": "audio",
        "file": (io.BytesIO(b"Sharma ji ko 2000 ka maal udhaar diya"), "voice.m4a"),
    }
    res = client.post("/api/v1/ai/extract", data=data, content_type="multipart/form-data")
    assert res.status_code == 200
    res_data = res.get_json()

    assert res_data["party_name"] == "Rahul Sharma"
    assert res_data["kind"] == "DR"
    assert res_data["amount"] == 200000


def test_ai_extract_missing_file_returns_400(client):
    """Missing file field returns 400 INVALID_INPUT."""
    res = client.post("/api/v1/ai/extract", data={"media_type": "image"}, content_type="multipart/form-data")
    assert res.status_code == 400
    err = res.get_json()
    assert err["error"]["code"] == "INVALID_INPUT"


def test_ai_extract_unsupported_file_returns_400(client):
    """Unsupported file extension returns 400 INVALID_INPUT."""
    data = {
        "file": (io.BytesIO(b"test data"), "file.exe"),
    }
    res = client.post("/api/v1/ai/extract", data=data, content_type="multipart/form-data")
    assert res.status_code == 400
    err = res.get_json()
    assert err["error"]["code"] == "INVALID_INPUT"
