"""The packaged copy of views.sql (used at startup) must match the one shown to Supabase users."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_packaged_views_match_supabase_views():
    a = (ROOT / "supabase" / "views.sql").read_text(encoding="utf-8").replace("\r\n", "\n")
    b = (ROOT / "backend" / "app" / "sql" / "views.sql").read_text(encoding="utf-8").replace("\r\n", "\n")
    assert a == b, "Update backend/app/sql/views.sql whenever supabase/views.sql changes"
