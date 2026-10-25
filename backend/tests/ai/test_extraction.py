import pytest

try:
    from app.services.extraction import ExtractionService, MAX_UPLOAD_BYTES
except ImportError:
    from backend.app.services.extraction import ExtractionService, MAX_UPLOAD_BYTES


def test_extraction_from_image():
    """Verify extraction from bill image bytes."""
    service = ExtractionService()
    bill_content = b"Customer: Rahul Sharma\nDate: 2026-10-24\nRice and Oil Total: Rs 2,500.00\nUdhaar DR"
    res = service.extract_from_file(bill_content, "bill.jpg", media_type="image")

    assert res["party_name"] == "Rahul Sharma"
    assert res["kind"] == "DR"
    assert res["amount"] == 250000
    assert res["txn_date"] == "2026-10-24"
    assert isinstance(res["confidence"], float)
    assert len(res["party_candidates"]) >= 1
    assert res["party_candidates"][0]["name"] == "Rahul Sharma"


def test_extraction_from_voice_audio():
    """Verify extraction from voice note audio bytes."""
    service = ExtractionService()
    voice_content = b"Priya Patel se 800 rupaye cash mila"
    res = service.extract_from_file(voice_content, "note.m4a", media_type="audio")

    assert res["party_name"] == "Priya Patel"
    assert res["kind"] == "CR"
    assert res["amount"] == 80000
    assert "party_candidates" in res
    assert res["party_candidates"][0]["name"] == "Priya Patel"


def test_extraction_exceeds_max_size():
    """File exceeding MAX_UPLOAD_BYTES raises ValueError."""
    service = ExtractionService()
    oversized = b"0" * (MAX_UPLOAD_BYTES + 10)
    with pytest.raises(ValueError, match="File size exceeds"):
        service.extract_from_file(oversized, "huge.jpg")


def test_extraction_unsupported_extension():
    """Unsupported file extension raises ValueError."""
    service = ExtractionService()
    with pytest.raises(ValueError, match="Unsupported file extension"):
        service.extract_from_file(b"test", "document.pdf")
