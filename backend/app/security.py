"""Auth API key + rate limiting (mémoire, PostgreSQL ou Redis)."""

from __future__ import annotations

import secrets
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status

from app.config import Settings, get_settings
from app.rate_limit import rate_limiter


def client_ip(request: Request) -> str:
    """IP de l'appelant, en ne faisant confiance qu'aux proxys déclarés.

    ``X-Forwarded-For`` est un en-tête fourni par le client : prendre son
    premier élément permet à quiconque de changer d'identité à chaque requête et
    donc de contourner intégralement le rate limiting. On ne lit donc l'en-tête
    que si ``trusted_proxy_hops`` le déclare, et on compte depuis la droite —
    seule extrémité qu'un attaquant ne contrôle pas.
    """
    hops = get_settings().trusted_proxy_hops
    if hops > 0:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            chain = [part.strip() for part in forwarded.split(",") if part.strip()]
            if chain:
                return chain[-min(hops, len(chain))]
    if request.client:
        return request.client.host
    return "unknown"


# Volontairement synchrone : les backends de rate-limit font des entrées-sorties
# bloquantes (psycopg, redis-py). Dans une dépendance `async def`, cet appel
# bloquerait la boucle d'événements et sérialiserait toute l'API.
def enforce_rate_limit(request: Request) -> None:
    settings = get_settings()
    path = request.url.path
    if path.endswith("/admin/login"):
        limit = settings.rate_limit_login
        window = settings.rate_limit_login_window
    elif request.method not in {"GET", "HEAD", "OPTIONS"}:
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
    # Comparaison sur les octets : compare_digest refuse les str non-ASCII, et
    # une clé accentuée provoquerait un TypeError, donc un 500 au lieu d'un 401.
    if not x_api_key or not secrets.compare_digest(
        x_api_key.encode("utf-8"), expected.encode("utf-8")
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Clé API manquante ou invalide (header X-API-Key).",
        )
