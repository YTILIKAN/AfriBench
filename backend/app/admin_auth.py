"""Auth backoffice : token de session signé (HMAC, stdlib) + dépendance admin."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status

from app.config import Settings, get_settings


def _secret(settings: Settings) -> bytes:
    # Secret dérivé du mot de passe admin (changer le mot de passe invalide les sessions).
    return hashlib.sha256(settings.admin_password.encode()).digest()


def _b64decode(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def issue_token(settings: Settings) -> str:
    payload = {"exp": int(time.time()) + settings.admin_session_ttl}
    body = base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b"=")
    sig = hmac.new(_secret(settings), body, hashlib.sha256).digest()
    return f"{body.decode()}.{base64.urlsafe_b64encode(sig).rstrip(b'=').decode()}"


def verify_token(token: str, settings: Settings) -> bool:
    try:
        body_b64, sig_b64 = token.split(".", 1)
        body = body_b64.encode()
        expected = hmac.new(_secret(settings), body, hashlib.sha256).digest()
        provided = _b64decode(sig_b64)
        if not hmac.compare_digest(expected, provided):
            return False
        payload = json.loads(_b64decode(body_b64))
        return int(payload.get("exp", 0)) > time.time()
    except Exception:
        return False


def verify_admin_password(password: str, settings: Settings) -> bool:
    if not settings.admin_enabled:
        return False
    # Sur les octets : compare_digest refuse les str non-ASCII, et un mot de
    # passe accentué — le cas normal en français — lèverait un TypeError, donc
    # un 500 déclenchable sans authentification.
    return secrets.compare_digest(
        password.encode("utf-8"), settings.admin_password.encode("utf-8")
    )


def require_admin(
    authorization: Annotated[str | None, Header()] = None,
    settings: Settings = Depends(get_settings),
) -> None:
    if not settings.admin_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Backoffice désactivé : définissez AFRIBENCH_ADMIN_PASSWORD.",
        )
    token = ""
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    if not token or not verify_token(token, settings):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session invalide ou expirée. Reconnectez-vous.",
            headers={"WWW-Authenticate": "Bearer"},
        )
