"""Utilitaires pour le task config AfriBench dans LM Evaluation Harness."""

# Format du prompt AfriBench pour le multiple-choice
# Chaque question a : question, options (dict A/B/C/D)
# Le format standard suit MMLU : "Question: ...\nA. ...\nB. ...\nC. ...\nD. ...\nRéponse:"


def doc_to_text(doc):
    """Formate une question en texte pour le modèle.

    Args:
        doc: dictionnaire représentant une question du dataset JSON.
             Contient 'question' (str) et 'options' (dict {A: ..., B: ..., ...}).
    """
    question = doc.get("question", "")
    options = doc.get("options", {})

    # Format standard AfriBench
    if isinstance(options, dict):
        options_str = "\n".join(f"{k}. {v}" for k, v in options.items())
    else:
        options_str = str(options)

    return f"Question : {question}\n{options_str}\nRéponse :"


def doc_to_choice(doc):
    """Retourne la liste des choix possibles.

    Args:
        doc: dictionnaire représentant une question.

    Returns:
        Liste des lettres des choix (ex: ["A", "B", "C", "D"])
    """
    options = doc.get("options", {})
    if isinstance(options, dict):
        return list(options.keys())
    return ["A", "B", "C", "D"]
