"""Non-régression de la rédaction des secrets.

Le champ ``error`` d'un job est lisible sans authentification via GET /jobs.
`requests` recopiant l'URL complète dans ses HTTPError, une clé passée en query
string se retrouvait exposée à un visiteur anonyme.
"""
from __future__ import annotations

from app.redaction import PLACEHOLDER, redact_secrets


def test_masque_une_cle_en_query_string() -> None:
    message = (
        "401 Client Error: Unauthorized for url: "
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash"
        ":generateContent?key=AIzaSyREAL0SECRET0KEY0VALUE00"
    )
    out = redact_secrets(message)
    assert "AIzaSyREAL0SECRET0KEY0VALUE00" not in out
    assert PLACEHOLDER in out
    # Le contexte utile pour diagnostiquer doit survivre.
    assert "401" in out and "gemini-2.5-flash" in out


def test_masque_les_prefixes_connus() -> None:
    for secret in (
        "sk-proj-ABCDEFGHIJKLMNOP",
        "AIzaSyABCDEFGHIJKLMNOPQRSTUVWX",
        "hf_ABCDEFGHIJKLMNOP",
    ):
        out = redact_secrets(f"échec avec la clé {secret} sur le fournisseur")
        assert secret not in out
        assert PLACEHOLDER in out


def test_masque_une_valeur_fournie_par_lappelant() -> None:
    secret = "cle-issue-de-la-base-de-donnees"
    out = redact_secrets(f"Unauthorized: {secret}", extra=(secret,))
    assert secret not in out


def test_masque_une_variable_denvironnement(monkeypatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "valeur-sensible-en-environnement")
    out = redact_secrets("échec : valeur-sensible-en-environnement refusée")
    assert "valeur-sensible-en-environnement" not in out


def test_ignore_les_valeurs_trop_courtes(monkeypatch) -> None:
    """Masquer une chaîne de 3 caractères rendrait tous les messages illisibles."""
    monkeypatch.setenv("OPENAI_API_KEY", "abc")
    out = redact_secrets("abcdef : le modèle abc a échoué")
    assert out == "abcdef : le modèle abc a échoué"


def test_tolere_les_messages_vides() -> None:
    assert redact_secrets("") == ""
