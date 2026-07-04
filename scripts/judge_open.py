#!/usr/bin/env python3
"""
judge_open.py
-------------
Évaluation des réponses aux questions OUVERTES d'AfriBench via LLM-as-judge.

Pourquoi ce module :
  Les métriques automatiques (ROUGE, BLEU, QuestEval) ne capturent pas de façon
  fiable la justesse d'une réponse libre — les auteurs d'AfriMed-QA le montrent
  et défèrent l'évaluation ouverte à une notation humaine. Ce module applique
  une grille explicite via un modèle juge, en comparant à une réponse de
  référence et à des points-clés attendus. Un sous-échantillon doit être
  contre-noté par un humain pour mesurer l'accord humain-juge.

Principes de crédibilité :
  - Le juge est un modèle FIXE, documenté, idéalement DISTINCT des modèles
    évalués (pour éviter le biais d'auto-préférence).
  - Température 0 (et seed si l'API le permet).
  - Le prompt de notation est public et versionné (JUDGE_SYSTEM ci-dessous).

Intégration :
  Ce module ne fait pas les appels réseau lui-même. Fournissez une fonction
  `judge_call_fn(system: str, user: str) -> str` (à brancher sur la même
  couche multi-provider que scripts/afribench.py). Cela garde le module
  testable et agnostique du fournisseur.
"""

import json
import re

# ── Grilles de notation ────────────────────────────────────────────────────
# Chaque critère : score 0-5. Les poids d'une grille somment à 1.0.
RUBRICS = {
    "general_v1": [
        {"criterion": "factual_accuracy", "label": "Exactitude factuelle",
         "weight": 0.45, "max_score": 5,
         "description": "Les affirmations sont-elles correctes et cohérentes "
                        "avec la réponse de référence ?"},
        {"criterion": "completeness", "label": "Complétude",
         "weight": 0.25, "max_score": 5,
         "description": "La réponse couvre-t-elle les points-clés attendus ?"},
        {"criterion": "contextual_grounding",
         "label": "Ancrage contextuel africain",
         "weight": 0.20, "max_score": 5,
         "description": "La réponse tient-elle compte du contexte africain "
                        "pertinent (réalités locales, ressources, usages) ?"},
        {"criterion": "clarity", "label": "Clarté",
         "weight": 0.10, "max_score": 5,
         "description": "La réponse est-elle claire, structurée et sans "
                        "verbiage inutile ?"},
    ],
    # Variante médicale : ajoute la sécurité clinique, pondération prudente.
    "medical_v1": [
        {"criterion": "factual_accuracy", "label": "Exactitude clinique",
         "weight": 0.40, "max_score": 5,
         "description": "Les informations médicales sont-elles correctes et "
                        "cohérentes avec la référence ?"},
        {"criterion": "completeness", "label": "Complétude",
         "weight": 0.25, "max_score": 5,
         "description": "Les points-clés cliniques attendus sont-ils couverts ?"},
        {"criterion": "safety", "label": "Sécurité / absence de préjudice",
         "weight": 0.20, "max_score": 5,
         "description": "La réponse évite-t-elle tout conseil dangereux, "
                        "posologie erronée ou omission à risque ? Une réponse "
                        "contenant un conseil potentiellement nuisible doit "
                        "recevoir un score bas ici."},
        {"criterion": "contextual_grounding",
         "label": "Ancrage contextuel africain",
         "weight": 0.15, "max_score": 5,
         "description": "La réponse tient-elle compte du contexte de soins "
                        "africain (disponibilité des traitements, épidémiologie "
                        "locale, ressources) ?"},
    ],
}

JUDGE_VERSION = "afribench-judge-1.0"

JUDGE_SYSTEM = (
    "Tu es un évaluateur expert et impartial. Tu notes la réponse d'un modèle "
    "à une question ouverte, en te fondant sur une réponse de référence et une "
    "liste de points-clés attendus. Règles :\n"
    "- Note le FOND, pas la forme : une formulation différente de la référence "
    "est acceptable si l'information est correcte et complète.\n"
    "- Ne récompense pas la longueur : une réponse concise et juste vaut mieux "
    "qu'une réponse longue et vague.\n"
    "- Signale toute affirmation incorrecte ou dangereuse.\n"
    "- Chaque critère est noté de 0 (absent/faux) à 5 (excellent).\n"
    "- Réponds UNIQUEMENT par un objet JSON valide, sans texte autour, sans "
    "balises Markdown."
)


def build_judge_user_prompt(question, reference_answer, key_points,
                            rubric, model_answer):
    kp = "\n".join(f"- {p}" for p in (key_points or [])) or "(aucun fourni)"
    crit_lines = "\n".join(
        f'  "{c["criterion"]}": entier 0-5  // {c["label"]} : {c["description"]}'
        for c in rubric
    )
    schema = "{\n" + ",\n".join(
        f'  "{c["criterion"]}": {{"score": <0-5>, "justification": "<courte>"}}'
        for c in rubric
    ) + "\n}"
    return (
        f"QUESTION :\n{question}\n\n"
        f"RÉPONSE DE RÉFÉRENCE :\n{reference_answer}\n\n"
        f"POINTS-CLÉS ATTENDUS :\n{kp}\n\n"
        f"RÉPONSE À ÉVALUER :\n{model_answer}\n\n"
        f"Critères à noter (0-5) :\n{crit_lines}\n\n"
        f"Réponds exactement selon ce schéma JSON :\n{schema}"
    )


def parse_judge_response(text, rubric):
    """Extrait les scores par critère depuis la sortie JSON du juge."""
    s = text.strip()
    # retire d'éventuelles clôtures Markdown
    s = re.sub(r"^```(?:json)?|```$", "", s, flags=re.MULTILINE).strip()
    # isole le premier objet JSON
    m = re.search(r"\{.*\}", s, flags=re.DOTALL)
    if not m:
        raise ValueError(f"Réponse du juge non parsable : {text[:200]}")
    data = json.loads(m.group(0))
    scores = {}
    for c in rubric:
        entry = data.get(c["criterion"])
        if isinstance(entry, dict):
            scores[c["criterion"]] = float(entry.get("score", 0))
        elif isinstance(entry, (int, float)):
            scores[c["criterion"]] = float(entry)
        else:
            scores[c["criterion"]] = 0.0
    return scores, data


def aggregate_score(scores, rubric):
    """Score pondéré normalisé sur 100 (comparable aux % des QCM)."""
    total = 0.0
    for c in rubric:
        s = scores.get(c["criterion"], 0.0)
        total += c["weight"] * (s / c["max_score"])
    return round(total * 100, 1)


def score_open_answer(question, reference_answer, key_points, rubric_id,
                      model_answer, judge_call_fn):
    """
    Note une réponse ouverte. `judge_call_fn(system, user) -> str` effectue
    l'appel réel au modèle juge (température 0).
    Retourne un dict avec le score global et le détail par critère.
    """
    rubric = RUBRICS[rubric_id]
    user = build_judge_user_prompt(
        question, reference_answer, key_points, rubric, model_answer)
    raw = judge_call_fn(JUDGE_SYSTEM, user)
    scores, detail = parse_judge_response(raw, rubric)
    return {
        "judge_version": JUDGE_VERSION,
        "rubric_id": rubric_id,
        "criteria_scores": scores,
        "criteria_detail": detail,
        "score": aggregate_score(scores, rubric),
    }


# ── Démonstration hors-ligne (juge factice) ────────────────────────────────
if __name__ == "__main__":
    def fake_judge(system, user):
        # Renvoie une notation plausible pour tester le parsing/agrégation.
        return json.dumps({
            "factual_accuracy": {"score": 4, "justification": "Correct dans l'ensemble."},
            "completeness": {"score": 3, "justification": "Un point-clé manquant."},
            "safety": {"score": 5, "justification": "Aucun conseil dangereux."},
            "contextual_grounding": {"score": 3, "justification": "Peu de contexte local."},
        })

    result = score_open_answer(
        question="Question test ?",
        reference_answer="Réponse de référence.",
        key_points=["point 1", "point 2"],
        rubric_id="medical_v1",
        model_answer="Réponse du modèle.",
        judge_call_fn=fake_judge,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))
