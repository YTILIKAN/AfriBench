"""Non-régression de l'extraction de réponse — le cœur de la notation.

L'implémentation initiale renvoyait la première lettre A/B/C/D rencontrée, ce qui
notait « Désolé, je ne peux pas répondre. » comme un D et « Rate limit exceeded »
comme un A. Les scores publiés étaient donc contaminés dans les deux sens, et
``no_answer`` était pratiquement inatteignable.

Règle : en cas d'ambiguïté, on refuse (``None``) plutôt que de deviner.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]


def _load_cli():
    spec = importlib.util.spec_from_file_location(
        "afribench_cli_test", REPO_ROOT / "scripts" / "afribench.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


extract_answer = _load_cli().extract_answer


@pytest.mark.parametrize(
    "response,expected",
    [
        ("A", "A"),
        ("  b  ", "B"),
        ("**C**", "C"),
        ("(D)", "D"),
        ("A.", "A"),
        ("B)", "B"),
    ],
)
def test_lettre_seule(response: str, expected: str) -> None:
    assert extract_answer(response) == expected


@pytest.mark.parametrize(
    "response,expected",
    [
        ("B) Empire du Mali", "B"),
        ("B. Empire du Mali", "B"),
        ("A - Empire du Ghana", "A"),
        ("C : Empire Songhaï", "C"),
    ],
)
def test_lettre_en_tete_suivie_dun_separateur(response: str, expected: str) -> None:
    assert extract_answer(response) == expected


@pytest.mark.parametrize(
    "response,expected",
    [
        ("La réponse est C", "C"),
        ("La reponse est C", "C"),
        ("Answer: D", "D"),
        ("Réponse : B", "B"),
        ("La bonne réponse est la lettre C.", "C"),
    ],
)
def test_formulation_explicite(response: str, expected: str) -> None:
    assert extract_answer(response) == expected


@pytest.mark.parametrize(
    "response",
    [
        # Le premier caractère est une lettre d'option, mais ce n'est pas une réponse.
        "D'après moi, c'est B",
        "Désolé, je ne peux pas répondre.",
        # Message d'erreur du fournisseur : ne doit jamais être noté.
        "Rate limit exceeded, please retry",
        "Bad request: invalid model",
        # Prose sans réponse identifiable.
        "Aucune de ces options n'est correcte",
        "Bonne question ! Cela dépend du contexte.",
        # Vide ou blanc.
        "",
        "   ",
    ],
)
def test_refuse_de_deviner(response: str) -> None:
    assert extract_answer(response) is None


def test_plusieurs_lettres_isolees_restent_ambigues() -> None:
    """Deux options citées sans conclusion : on ne tranche pas à la place du modèle."""
    assert extract_answer("Entre A et C, je pense que les deux sont défendables") is None


def test_une_seule_lettre_isolee_est_retenue() -> None:
    assert extract_answer("Je choisis la proposition B parmi les quatre") == "B"
