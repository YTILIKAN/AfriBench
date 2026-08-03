"""Contenu textuel — onglet À propos du Space AfriBench."""

ABOUT_MD = """
# AfriBench

Benchmark public pour évaluer les modèles de langage sur les **réalités africaines**.

Porté par [YTILIKAN](https://ytilikan.com) · code : [GitHub](https://github.com/YTILIKAN/AfriBench)

## Statut

> **Prototype v0.1** — le classement est **indicatif**.  
> L'échantillon (centaine de QCM en français) reste trop petit pour des conclusions statistiquement fortes.

## Méthodologie (résumé)

- Format : QCM A/B/C/D, zero-shot
- `temperature = 0.0`, `max_tokens = 256`
- Scoring : 1 point par bonne réponse
- Script : [`scripts/afribench.py`](https://github.com/YTILIKAN/AfriBench/blob/main/scripts/afribench.py)
- Tasks `lm-eval` : `afribench` / `afribench_all`

## Dataset

- Carte : [`DATASET_CARD.md`](https://github.com/YTILIKAN/AfriBench/blob/main/data/DATASET_CARD.md)
- Splits : `african` (benchmark) + `control` (20 questions témoins non-africaines)

## Citation

```bibtex
@misc{afribench2026,
  title  = {AfriBench: Evaluating Language Models on African Realities},
  author = {YTILIKAN},
  year   = {2026},
  url    = {https://github.com/YTILIKAN/AfriBench},
  note   = {Prototype v0.1}
}
```

## Limites

- Français uniquement (multilingue planifié)
- Pas encore de validation externe systématique
- Pas de tâches ouvertes (génération / traduction) dans v0.1
"""
