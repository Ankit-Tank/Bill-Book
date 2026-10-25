import re
from difflib import SequenceMatcher
from typing import List, Dict, Any, Optional

# Static JSON party list used until Phase 2 database integration is merged
STATIC_PARTIES: List[Dict[str, Any]] = [
    {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d471",
        "name": "Rahul Sharma",
        "phone": "+919876543210",
    },
    {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d472",
        "name": "Priya Patel",
        "phone": "+919811223344",
    },
    {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d473",
        "name": "Amit Verma",
        "phone": "+919822334455",
    },
    {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d474",
        "name": "Sunita Devi",
        "phone": "+919833445566",
    },
    {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567891",
        "name": "Kisan Wholesale Traders",
        "phone": "+919844556677",
    },
    {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567892",
        "name": "Balaji Provisions Distributor",
        "phone": "+919855667788",
    },
]

HONORIFICS = {
    "ji", "bhai", "bhaiya", "sethji", "seth", "didi", "uncle",
    "sahab", "saab", "sir", "shree", "mr", "mrs", "m/s"
}


def normalize_name(name: str) -> str:
    """Strip honorifics, special characters, and extra whitespace."""
    if not name:
        return ""
    cleaned = re.sub(r"[^\w\s]", " ", name.lower())
    tokens = [t for t in cleaned.split() if t not in HONORIFICS]
    return " ".join(tokens)


def compute_similarity(query: str, target: str) -> float:
    """
    Compute fuzzy match similarity score between query and party target.
    Combines token containment, token-level matching, and SequenceMatcher.
    """
    q_norm = normalize_name(query)
    t_norm = normalize_name(target)

    if not q_norm or not t_norm:
        return 0.0

    # Exact normalized match
    if q_norm == t_norm:
        return 1.0

    q_tokens = set(q_norm.split())
    t_tokens = set(t_norm.split())

    # Exact token containment (e.g., query "Sharma" inside "Rahul Sharma")
    if q_tokens.issubset(t_tokens):
        return 0.95
    if t_tokens.issubset(q_tokens):
        return 0.95

    # Any significant token overlap (e.g. matching surname or first name)
    overlap = q_tokens.intersection(t_tokens)
    if overlap:
        # Longest token in overlap
        max_overlap_len = max(len(t) for t in overlap)
        if max_overlap_len >= 4:
            return 0.90

    # Fallback to string SequenceMatcher
    seq_ratio = SequenceMatcher(None, q_norm, t_norm).ratio()
    return round(seq_ratio, 2)


def match_party(
    party_name: str,
    parties: Optional[List[Dict[str, Any]]] = None,
    threshold: float = 0.40,
    limit: int = 5,
) -> List[Dict[str, Any]]:
    """
    Fuzzy match query party_name against parties list and return sorted party_candidates.
    """
    if not party_name:
        return []

    party_list = parties if parties is not None else STATIC_PARTIES
    scored_candidates = []

    for p in party_list:
        score = compute_similarity(party_name, p["name"])
        if score >= threshold:
            scored_candidates.append({
                "id": p["id"],
                "name": p["name"],
                "phone": p.get("phone"),
                "score": score,
            })

    # Sort descending by score
    scored_candidates.sort(key=lambda c: c["score"], reverse=True)
    return scored_candidates[:limit]
