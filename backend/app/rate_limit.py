"""Rate limiting distribué : mémoire, PostgreSQL ou Redis."""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from typing import Protocol

from sqlalchemy import delete, func, select

from app.config import Settings, get_settings


class RateLimitBackend(Protocol):
    def check(self, key: str, limit: int, window_seconds: float) -> tuple[bool, int]:
        """Retourne (autorisé, retry_after_seconds)."""

    def reset(self) -> None:
        """Réinitialise l'état (tests)."""


class MemoryRateLimitBackend:
    """Fenêtre glissante en mémoire (single-process)."""

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str, limit: int, window_seconds: float) -> tuple[bool, int]:
        now = time.monotonic()
        with self._lock:
            q = self._hits[key]
            cutoff = now - window_seconds
            while q and q[0] < cutoff:
                q.popleft()
            if len(q) >= limit:
                retry = int(window_seconds - (now - q[0])) + 1
                return False, max(retry, 1)
            q.append(now)
            return True, 0

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


class PostgresRateLimitBackend:
    """Fenêtre glissante persistée en PostgreSQL."""

    def check(self, key: str, limit: int, window_seconds: float) -> tuple[bool, int]:
        from app.db import get_session
        from app.models import RateLimitHit

        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(seconds=window_seconds)
        session = get_session()
        try:
            session.execute(delete(RateLimitHit).where(RateLimitHit.hit_at < cutoff))
            count = session.scalar(
                select(func.count()).select_from(RateLimitHit).where(
                    RateLimitHit.key == key,
                    RateLimitHit.hit_at >= cutoff,
                )
            )
            if count is not None and count >= limit:
                oldest = session.scalar(
                    select(RateLimitHit.hit_at)
                    .where(RateLimitHit.key == key, RateLimitHit.hit_at >= cutoff)
                    .order_by(RateLimitHit.hit_at.asc())
                    .limit(1)
                )
                if oldest is not None:
                    elapsed = (now - oldest).total_seconds()
                    retry = int(window_seconds - elapsed) + 1
                    return False, max(retry, 1)
                return False, int(window_seconds)
            session.add(RateLimitHit(key=key, hit_at=now))
            session.commit()
            return True, 0
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def reset(self) -> None:
        from app.db import get_session
        from app.models import RateLimitHit

        session = get_session()
        try:
            session.execute(delete(RateLimitHit))
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()


class RedisRateLimitBackend:
    """Fenêtre glissante via sorted set Redis (multi-réplica)."""

    def __init__(self, redis_url: str) -> None:
        import redis

        self._client = redis.from_url(redis_url, decode_responses=True)

    def check(self, key: str, limit: int, window_seconds: float) -> tuple[bool, int]:
        now = time.time()
        window_start = now - window_seconds
        pipe = self._client.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        _, count = pipe.execute()
        if count >= limit:
            oldest = self._client.zrange(key, 0, 0, withscores=True)
            if oldest:
                retry = int(window_seconds - (now - oldest[0][1])) + 1
                return False, max(retry, 1)
            return False, int(window_seconds)
        member = f"{now}:{time.monotonic_ns()}"
        pipe = self._client.pipeline()
        pipe.zadd(key, {member: now})
        pipe.expire(key, int(window_seconds) + 1)
        pipe.execute()
        return True, 0

    def reset(self) -> None:
        for key in self._client.scan_iter("afribench:rl:*"):
            self._client.delete(key)


def _resolve_backend(settings: Settings | None = None) -> RateLimitBackend:
    settings = settings or get_settings()
    backend = (settings.rate_limit_backend or "auto").lower()
    if backend == "memory":
        return MemoryRateLimitBackend()
    if backend == "redis" or (backend == "auto" and settings.redis_enabled):
        return RedisRateLimitBackend(settings.redis_url.strip())
    if backend == "postgres" or (backend == "auto" and settings.db_enabled):
        return PostgresRateLimitBackend()
    return MemoryRateLimitBackend()


class RateLimiter:
    """Façade : sélectionne le backend selon la config."""

    def __init__(self) -> None:
        self._backend: RateLimitBackend | None = None
        self._backend_key: str | None = None
        self._lock = threading.Lock()

    def _get_backend(self) -> RateLimitBackend:
        settings = get_settings()
        key = f"{settings.rate_limit_backend}:{settings.redis_url}:{settings.database_url}"
        with self._lock:
            if self._backend is None or self._backend_key != key:
                self._backend = _resolve_backend(settings)
                self._backend_key = key
            return self._backend

    def check(self, key: str, limit: int, window_seconds: float) -> tuple[bool, int]:
        return self._get_backend().check(key, limit, window_seconds)

    def reset(self) -> None:
        with self._lock:
            if self._backend is not None:
                self._backend.reset()
            self._backend = None
            self._backend_key = None


rate_limiter = RateLimiter()
