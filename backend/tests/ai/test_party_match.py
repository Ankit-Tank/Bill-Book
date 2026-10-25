try:
    from app.services.party_match import match_party, compute_similarity, normalize_name
except ImportError:
    from backend.app.services.party_match import match_party, compute_similarity, normalize_name


def test_normalize_name():
    """Verify honorific stripping and lowercase normalization."""
    assert normalize_name("Sharma ji") == "sharma"
    assert normalize_name("Sunita Didi") == "sunita"
    assert normalize_name("Mr. Rahul Sharma") == "rahul sharma"
    assert normalize_name("Kisan Sethji") == "kisan"


def test_compute_similarity_exact():
    """Exact and token-containment matches return high score."""
    assert compute_similarity("Rahul Sharma", "Rahul Sharma") == 1.0
    assert compute_similarity("Rahul", "Rahul Sharma") >= 0.90
    assert compute_similarity("Sharma ji", "Rahul Sharma") >= 0.90


def test_match_party_candidates():
    """Verify fuzzy matching returns sorted candidates with high score."""
    candidates = match_party("Sharma ji")
    assert len(candidates) >= 1
    top = candidates[0]
    assert top["name"] == "Rahul Sharma"
    assert top["score"] >= 0.85

    priya_cand = match_party("Priya")
    assert len(priya_cand) >= 1
    assert priya_cand[0]["name"] == "Priya Patel"

    unknown_cand = match_party("Random Nonexistent Person XYZ")
    assert len(unknown_cand) == 0
