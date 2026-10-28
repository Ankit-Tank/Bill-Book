import os
import uuid
import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional, overload
import psycopg2
from psycopg2.pool import ThreadedConnectionPool
from psycopg2.extras import RealDictCursor
from flask import g, current_app

_pool: Optional[ThreadedConnectionPool] = None


def _redact_url(url: str) -> str:
    """Hide the user:password part of a connection string before logging it."""
    import re
    return re.sub(r"://[^@/]*@", "://***@", url or "")


def ensure_views(app) -> None:
    """Create or refresh the analytical SQL views the reports, credit and alert features rely on.

    The statements use CREATE OR REPLACE, so this is safe to run on every start. It means a fresh
    Supabase project only needs supabase/schema.sql applied by hand.
    """
    if _pool is None:
        return
    path = os.path.join(os.path.dirname(__file__), "sql", "views.sql")
    try:
        with open(path, encoding="utf-8") as fh:
            sql = fh.read()
    except OSError as e:
        app.logger.warning("Could not read views.sql: %s", e)
        return
    conn = None
    try:
        conn = _pool.getconn()
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
        app.logger.info("Analytical views are up to date")
    except Exception as e:  # noqa: BLE001
        if conn is not None:
            conn.rollback()
        app.logger.warning("Could not apply analytical views (is schema.sql applied?): %s", e)
    finally:
        if conn is not None:
            _pool.putconn(conn)


def init_db_pool(app) -> None:
    """Initialize the ThreadedConnectionPool using the database URL from config."""
    global _pool
    db_url = app.config.get("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL is not configured")

    # Supabase / cloud postgres typically requires SSL unless localhost
    sslmode = None
    if "supabase.co" in db_url or "render.com" in db_url or "railway.app" in db_url:
        if "sslmode=" not in db_url:
            sslmode = "require"

    connect_kwargs = {}
    if sslmode:
        connect_kwargs["sslmode"] = sslmode

    min_conn = 1
    max_conn = 20
    try:
        _pool = ThreadedConnectionPool(min_conn, max_conn, dsn=db_url, **connect_kwargs)
    except psycopg2.OperationalError as e:
        app.logger.warning(
            "Could not connect to PostgreSQL database (%s). "
            "Server will start in degraded mode (database queries will return 503 until connected): %s",
            _redact_url(db_url),
            e,
        )
        _pool = None


def close_db_pool() -> None:
    """Close all connections in the pool."""
    global _pool
    if _pool is not None and not _pool.closed:
        _pool.closeall()
        _pool = None


def get_db():
    """Get a database connection from the pool for the current request context."""
    if "db_conn" not in g:
        if _pool is None:
            init_db_pool(current_app)
        if _pool is None:
            from . import APIError
            raise APIError(
                "DATABASE_UNAVAILABLE",
                "Database connection failed. Ensure PostgreSQL or Supabase is running and check DATABASE_URL in .env.",
                503,
            )
        g.db_conn = _pool.getconn()
    return g.db_conn


def close_db(e=None) -> None:
    """Teardown hook: commit or rollback and return connection to pool."""
    conn = g.pop("db_conn", None)
    if conn is not None and _pool is not None and not _pool.closed:
        try:
            if e is None:
                conn.commit()
            else:
                conn.rollback()
        except Exception:
            pass
        finally:
            _pool.putconn(conn)


def serialize_value(v: Any) -> Any:
    """Serialize database types to standard JSON-friendly formats."""
    if isinstance(v, uuid.UUID):
        return str(v)
    elif isinstance(v, datetime.datetime):
        if v.tzinfo is not None:
            return v.strftime("%Y-%m-%dT%H:%M:%SZ")
        return v.strftime("%Y-%m-%dT%H:%M:%SZ")
    elif isinstance(v, datetime.date):
        return v.isoformat()
    elif isinstance(v, Decimal):
        return int(v) if v % 1 == 0 else float(v)
    return v


@overload
def serialize_row(row: None) -> None: ...


@overload
def serialize_row(row: Dict[str, Any]) -> Dict[str, Any]: ...


def serialize_row(row: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Convert row dict values to serialized JSON types."""
    if row is None:
        return None
    return {k: serialize_value(v) for k, v in row.items()}


def query_all(query: str, params: Optional[Any] = None) -> List[Dict[str, Any]]:
    """Execute a SELECT query and return all matching rows as dictionaries."""
    conn = get_db()
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params or ())
        rows = cur.fetchall()
        return [serialize_row(r) for r in rows]


def query_one(query: str, params: Optional[Any] = None) -> Optional[Dict[str, Any]]:
    """Execute a SELECT query and return a single row as a dictionary or None."""
    conn = get_db()
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params or ())
        row = cur.fetchone()
        return serialize_row(row)


def execute(query: str, params: Optional[Any] = None) -> int:
    """Execute an INSERT, UPDATE, or DELETE query and return the affected rowcount."""
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute(query, params or ())
        return cur.rowcount


def execute_returning(query: str, params: Optional[Any] = None) -> Optional[Dict[str, Any]]:
    """Execute an INSERT or UPDATE query with RETURNING clause and return the row."""
    conn = get_db()
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params or ())
        row = cur.fetchone()
        return serialize_row(row)


def check_db_health() -> bool:
    """Check database connectivity by running SELECT 1."""
    try:
        res = query_one("SELECT 1 AS healthy;")
        return bool(res and res.get("healthy") == 1)
    except Exception:
        return False
