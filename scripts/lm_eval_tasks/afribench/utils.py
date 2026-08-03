"""Utilitaires AfriBench pour LM Evaluation Harness (multiple_choice)."""

from __future__ import annotations


def doc_to_text(doc: dict) -> str:
    """Formate une question en prompt zero-shot (aligné sur scripts/afribench.py)."""
    question = doc.get("question", "")
    options = doc.get("options", {})

    if isinstance(options, dict):
        options_str = "\n".join(f"{k}. {v}" for k, v in options.items())
    else:
        options_str = str(options)

    return (
        "Vous êtes un assistant spécialisé dans l'évaluation des connaissances "
        "sur l'Afrique. Répondez UNIQUEMENT par la lettre de la bonne réponse "
        "(A, B, C ou D).\n\n"
        f"Question : {question}\n{options_str}\nRéponse :"
    )


def doc_to_choice(doc: dict) -> list[str]:
    """Lettres des choix (ordre du dict options)."""
    options = doc.get("options", {})
    if isinstance(options, dict) and options:
        return list(options.keys())
    return ["A", "B", "C", "D"]


def doc_to_target(doc: dict) -> int:
    """Index de la bonne réponse dans doc_to_choice (requis par lm-eval MCQ)."""
    choices = doc_to_choice(doc)
    answer = str(doc.get("answer", "")).strip().upper()
    try:
        return choices.index(answer)
    except ValueError:
        # Fallback : première lettre seule
        if answer and answer[0] in choices:
            return choices.index(answer[0])
        return 0
