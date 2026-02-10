import hashlib
import json
import logging

import redis.asyncio as redis

from app.config import get_settings

logger = logging.getLogger(__name__)

_pool: redis.Redis | None = None


async def get_redis() -> redis.Redis | None:
    """Get or create a Redis connection. Returns None if Redis is unavailable."""
    global _pool
    if _pool is not None:
        return _pool

    settings = get_settings()
    try:
        _pool = redis.from_url(settings.redis_url, decode_responses=True)
        await _pool.ping()
        return _pool
    except Exception:
        logger.warning("Redis is not available, caching disabled")
        _pool = None
        return None


def _make_key(prefix: str, *parts: str) -> str:
    raw = ":".join(parts)
    hashed = hashlib.sha256(raw.encode()).hexdigest()[:16]
    return f"{prefix}:{hashed}"


# ── Search result cache ──


async def get_cached_search(query: str, page: int, per_page: int) -> dict | None:
    r = await get_redis()
    if r is None:
        return None

    key = _make_key("search", query.lower().strip(), str(page), str(per_page))
    try:
        data = await r.get(key)
        return json.loads(data) if data else None
    except Exception:
        logger.warning("Redis get failed for search cache", exc_info=True)
        return None


async def set_cached_search(
    query: str, page: int, per_page: int, data: dict, ttl: int = 21600
) -> None:
    r = await get_redis()
    if r is None:
        return

    key = _make_key("search", query.lower().strip(), str(page), str(per_page))
    try:
        await r.set(key, json.dumps(data, ensure_ascii=False), ex=ttl)
    except Exception:
        logger.warning("Redis set failed for search cache", exc_info=True)


# ── Query transform cache ──


async def get_cached_transform(query: str) -> dict | None:
    r = await get_redis()
    if r is None:
        return None

    key = _make_key("transform", query.lower().strip())
    try:
        data = await r.get(key)
        return json.loads(data) if data else None
    except Exception:
        return None


async def set_cached_transform(query: str, data: dict, ttl: int = 86400) -> None:
    r = await get_redis()
    if r is None:
        return

    key = _make_key("transform", query.lower().strip())
    try:
        await r.set(key, json.dumps(data, ensure_ascii=False), ex=ttl)
    except Exception:
        logger.warning("Redis set failed for transform cache", exc_info=True)


# ── Summary cache ──


async def get_cached_summary(paper_id: str, language: str) -> str | None:
    r = await get_redis()
    if r is None:
        return None

    key = f"summary:{paper_id}:{language}"
    try:
        return await r.get(key)
    except Exception:
        return None


async def set_cached_summary(paper_id: str, language: str, summary: str) -> None:
    """Cache a summary permanently (no TTL — summaries don't change)."""
    r = await get_redis()
    if r is None:
        return

    key = f"summary:{paper_id}:{language}"
    try:
        await r.set(key, summary)
    except Exception:
        logger.warning("Redis set failed for summary cache", exc_info=True)
