"""Auth API key + rate limiting (mémoire, PostgreSQL ou Redis)."""

from __future__ import annotations

import secrets
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status

from app.config import Settings, get_settings
from app.rate_limit import rate_limiter


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


async def enforce_rate_limit(request: Request) -> None:
    settings = get_settings()
    path = request.url.path
    if path.endswith("/evaluate") or path.endswith("/reload"):
        limit = settings.rate_limit_write
        window = settings.rate_limit_write_window
    else:
        limit = settings.rate_limit_read
        window = settings.rate_limit_read_window

    ip = client_ip(request)
    prefix = "afribench:rl:" if settings.redis_enabled else ""
    ok, retry = rate_limiter.check(f"{prefix}{ip}:{path}", limit, window)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit dépassé. Réessayez dans {retry}s.",
            headers={"Retry-After": str(retry)},
        )


def require_api_key(
    x_api_key: Annotated[str | None, Header(alias="X-API-Key")] = None,
    settings: Settings = Depends(get_settings),
) -> None:
    """Protège les endpoints d'écriture. Si AFRIBENCH_API_KEY est vide → 503."""
    expected = (settings.api_key or "").strip()
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Évaluation API désactivée : définissez AFRIBENCH_API_KEY "
                "pour activer POST /evaluate et /reload."
            ),
        )
    if not x_api_key or not secrets.compare_digest(x_api_key, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Clé API manquante ou invalide (header X-API-Key).",
        )
