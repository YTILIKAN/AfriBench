"""Sécurité du backoffice et du rate limiting.

Trois défauts couverts ici :
 - /admin/login n'était pas rate-limité : dictionnaire illimité sur un mot de
   passe unique donnant 12 h d'accès CRUD complet ;
 - `secrets.compare_digest` refuse les str non-ASCII, donc un mot de passe
   accentué — le cas normal en français — produisait un 500 non authentifié ;
 - `X-Forwarded-For` était cru sans réserve, donc le faire tourner suffisait à
   contourner intégralement toute limite de débit.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.rate_limit import rate_limiter


@pytest.fixture(autouse=True)
def _reset_state():
    get_settings.cache_clear()
    rate_limiter.reset()
    yield
    get_settings.cache_clear()
    rate_limiter.reset()


def _client(monkeypatch, **env) -> TestClient:
    for key, value in env.items():
        monkeypatch.setenv(key, value)
    get_settings.cache_clear()
    rate_limiter.reset()
    return TestClient(app, raise_server_exceptions=False)


def test_login_est_rate_limite(monkeypatch) -> None:
    client = _client(
        monkeypatch,
        AFRIBENCH_ADMIN_PASSWORD="un-mot-de-passe",
        AFRIBENCH_RATE_LIMIT_LOGIN="3",
    )
    codes = [
        client.post("/api/v1/admin/login", json={"password": "faux"}).status_code
        for _ in range(6)
    ]
    assert 429 in codes, f"aucun 429 après 6 tentatives : {codes}"
    assert codes[:3] == [401, 401, 401]


def test_mot_de_passe_accentue_renvoie_401_pas_500(monkeypatch) -> None:
    client = _client(monkeypatch, AFRIBENCH_ADMIN_PASSWORD="mot-de-passe-attendu")
    resp = client.post("/api/v1/admin/login", json={"password": "mot-de-passé"})
    assert resp.status_code == 401


def test_mot_de_passe_accentue_valide_est_accepte(monkeypatch) -> None:
    client = _client(monkeypatch, AFRIBENCH_ADMIN_PASSWORD="mot-de-passé-éà")
    resp = client.post("/api/v1/admin/login", json={"password": "mot-de-passé-éà"})
    assert resp.status_code == 200
    assert resp.json()["token"]


def test_cle_api_accentuee_leve_401_pas_typeerror(monkeypatch) -> None:
    """httpx refuse d'émettre un en-tête non-ASCII, mais un client brut le peut :
    la comparaison doit renvoyer 401 et non lever un TypeError (donc un 500)."""
    from fastapi import HTTPException

    from app.security import require_api_key

    monkeypatch.setenv("AFRIBENCH_API_KEY", "cle-attendue")
    get_settings.cache_clear()
    with pytest.raises(HTTPException) as excinfo:
        require_api_key(x_api_key="clé-accentuée", settings=get_settings())
    assert excinfo.value.status_code == 401


def test_x_forwarded_for_ne_contourne_pas_la_limite(monkeypatch) -> None:
    """Sans proxy déclaré, l'en-tête client ne doit pas changer le compteur."""
    client = _client(
        monkeypatch,
        AFRIBENCH_RATE_LIMIT_READ="3",
        AFRIBENCH_TRUSTED_PROXY_HOPS="0",
    )
    codes = [
        client.get(
            "/api/v1/health", headers={"X-Forwarded-For": f"10.0.0.{i}"}
        ).status_code
        for i in range(6)
    ]
    assert 429 in codes, f"la limite a été contournée en changeant d'IP : {codes}"


def test_proxy_declare_permet_de_distinguer_les_clients(monkeypatch) -> None:
    """Avec un proxy déclaré, on lit l'IP qu'il a écrite (dernier élément)."""
    client = _client(
        monkeypatch,
        AFRIBENCH_RATE_LIMIT_READ="3",
        AFRIBENCH_TRUSTED_PROXY_HOPS="1",
    )
    # Le proxy écrit son entrée en fin de chaîne ; le début est contrôlé par
    # le client et doit rester sans effet sur le compteur.
    codes = [
        client.get(
            "/api/v1/health",
            headers={"X-Forwarded-For": f"1.2.3.{i}, 203.0.113.9"},
        ).status_code
        for i in range(6)
    ]
    assert 429 in codes, f"le préfixe usurpable a été retenu : {codes}"
