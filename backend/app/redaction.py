"""Rédaction des secrets dans les messages d'erreur.

Le champ ``error`` d'un job d'évaluation est lisible sans authentification via
``GET /api/v1/jobs``. Or les bibliothèques HTTP recopient volontiers l'URL
complète — clé d'API en query string incluse — dans le message de leurs
exceptions. Cette rédaction est la dernière barrière avant persistance.
"""

from __future__ import annotations

import os
import re

PLACEHOLDER = "[secret masqué]"

# Clé passée en paramètre d'URL : ?key=..., &api_key=..., &access_token=...
_QUERY_SECRET = re.compile(
    r"([?&](?:key|api[-_]?key|access[-_]?token|token|password)=)[^&\s\"']+",
    re.IGNORECASE,
)

# Clés reconnaissables à leur préfixe, même hors URL.
_KNOWN_PREFIXES = re.compile(
    r"\b(?:sk-[A-Za-z0-9_-]{8,}"
    r"|AIza[A-Za-z0-9_-]{20,}"
    r"|hf_[A-Za-z0-9]{8,}"
    r"|xox[abpsr]-[A-Za-z0-9-]{8,})",
)

# Variables d'environnement dont la valeur ne doit jamais apparaître.
_SECRET_ENV_VARS = (
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "MISTRAL_API_KEY",
    "GEMINI_API_KEY",
    "GOOGLE_API_KEY",
    "DEEPSEEK_API_KEY",
    "TOGETHER_API_KEY",
    "HF_TOKEN",
    "AFRIBENCH_API_KEY",
    "AFRIBENCH_ADMIN_PASSWORD",
    "AFRIBENCH_ENCRYPTION_KEY",
)


def redact_secrets(message: str, extra: tuple[str, ...] = ()) -> str:
    """Remplace toute valeur sensible reconnaissable par un marqueur neutre.

    ``extra`` permet de masquer des secrets connus du contexte d'appel (par
    exemple la clé d'API du modèle en cours d'évaluation, lue en base et donc
    absente de l'environnement).
    """
    if not message:
        return message

    redacted = _QUERY_SECRET.sub(rf"\1{PLACEHOLDER}", message)
    redacted = _KNOWN_PREFIXES.sub(PLACEHOLDER, redacted)

    # Les valeurs littérales en dernier : elles peuvent apparaître sous une
    # forme que les motifs génériques ne reconnaissent pas.
    values = [os.environ.get(name, "") for name in _SECRET_ENV_VARS]
    values.extend(extra)
    for value in values:
        # Un secret trop court produirait des faux positifs destructeurs.
        if value and len(value) >= 8:
            redacted = redacted.replace(value, PLACEHOLDER)

    return redacted
