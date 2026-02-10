"""SQLite-based cache that works without Redis.
Drop-in replacement exposing the same async API as redis_client.
"""

import hashlib
import json
import logging
import sqlite3
import time
from pathlib import Path

logger = logging.getLogger(__name__)

_DB_PATH = Path(__file__).resolve().parent.parent.parent / "cache.db"
_conn: sqlite3.Connection | None = None


def _get_conn() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        _conn = sqlite3.connect(str(_DB_PATH), check_same_thread=False)
        _conn.execute("PRAGMA journal_mode=WAL")
        _conn.execute(
            "CREATE TABLE IF NOT EXISTS cache ("
            "  key TEXT PRIMARY KEY,"
            "  value TEXT NOT NULL,"
            "  expires_at REAL"
            ")"
        )
        _conn.execute("CREATE INDEX IF NOT EXISTS idx_expires ON cache(expires_at)")
        _conn.commit()
    return _conn


def _make_key(prefix: str, *parts: str) -> str:
    raw = ":".join(parts)
    hashed = hashlib.sha256(raw.encode()).hexdigest()[:16]
    return f"{prefix}:{hashed}"


def _get(key: str) -> str | None:
    conn = _get_conn()
    row = conn.execute(
        "SELECT value, expires_at FROM cache WHERE key = ?", (key,)
    ).fetchone()
    if row is None:
        return None
    value, expires_at = row
    if expires_at is not None and time.time() > expires_at:
        conn.execute("DELETE FROM cache WHERE key = ?", (key,))
        conn.commit()
        return None
    return value


def _set(key: str, value: str, ttl: int | None = None) -> None:
    conn = _get_conn()
    expires_at = time.time() + ttl if ttl else None
    conn.execute(
        "INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)",
        (key, value, expires_at),
    )
    conn.commit()


# ── Search result cache ──


async def get_cached_search(query: str, page: int, per_page: int, language: str = "") -> dict | None:
    key = _make_key("search", query.lower().strip(), str(page), str(per_page), language)
    try:
        data = _get(key)
        return json.loads(data) if data else None
    except Exception:
        logger.warning("Cache get failed for search", exc_info=True)
        return None


async def set_cached_search(
    query: str, page: int, per_page: int, data: dict, ttl: int = 21600, language: str = ""
) -> None:
    key = _make_key("search", query.lower().strip(), str(page), str(per_page), language)
    try:
        _set(key, json.dumps(data, ensure_ascii=False), ttl)
    except Exception:
        logger.warning("Cache set failed for search", exc_info=True)


# ── Query transform cache ──


async def get_cached_transform(query: str) -> dict | None:
    key = _make_key("transform", query.lower().strip())
    try:
        data = _get(key)
        return json.loads(data) if data else None
    except Exception:
        return None


async def set_cached_transform(query: str, data: dict, ttl: int = 86400) -> None:
    key = _make_key("transform", query.lower().strip())
    try:
        _set(key, json.dumps(data, ensure_ascii=False), ttl)
    except Exception:
        logger.warning("Cache set failed for transform", exc_info=True)


# ── Summary cache ──


async def get_cached_summary(paper_id: str, language: str) -> str | None:
    key = f"summary:{paper_id}:{language}"
    try:
        return _get(key)
    except Exception:
        return None


async def set_cached_summary(paper_id: str, language: str, summary: str) -> None:
    key = f"summary:{paper_id}:{language}"
    try:
        _set(key, summary)  # No TTL — summaries don't change
    except Exception:
        logger.warning("Cache set failed for summary", exc_info=True)


# ── Abstract translation cache ──


async def get_cached_translation(paper_id: str, language: str, difficulty: str) -> str | None:
    key = f"translation:{paper_id}:{language}:{difficulty}"
    try:
        return _get(key)
    except Exception:
        return None


async def set_cached_translation(
    paper_id: str, language: str, difficulty: str, text: str
) -> None:
    key = f"translation:{paper_id}:{language}:{difficulty}"
    try:
        _set(key, text)  # No TTL — translations don't change
    except Exception:
        logger.warning("Cache set failed for translation", exc_info=True)


# ── Fulltext translation cache ──


async def get_cached_fulltext(paper_id: str, language: str, difficulty: str) -> str | None:
    key = f"fulltext:{paper_id}:{language}:{difficulty}"
    try:
        return _get(key)
    except Exception:
        return None


async def set_cached_fulltext(
    paper_id: str, language: str, difficulty: str, data: str
) -> None:
    key = f"fulltext:{paper_id}:{language}:{difficulty}"
    try:
        _set(key, data)  # No TTL — fulltext translations don't change
    except Exception:
        logger.warning("Cache set failed for fulltext", exc_info=True)
