"""Contenu textuel — onglet À propos du Space AfriBench."""

ABOUT_MD = """
# AfriBench

Benchmark public pour évaluer les modèles de langage sur les **réalités africaines**.

Porté par [YTILIKAN](https://ytilikan.com) · code : [GitHub](https://github.com/YTILIKAN/AfriBench)

## Statut

> **Prototype v0.1** — le classement est **indicatif**.  
> Corpus : **350 QCM** Afrique (+ 20 témoins + tâches ouvertes pilotes).  
> Les scores publics affichés ici peuvent encore provenir d'un sous-ensemble seed (ex. 101) tant que les modèles n'ont pas été rejoués.

## Méthodologie (résumé)

- Format : QCM A/B/C/D, zero-shot
- `temperature = 0.0`, `max_tokens = 256`, few-shot = 0
- Scoring : 1 point par bonne réponse ; agrégation par catégorie / difficulté
- Retries sur 429 ; script : [`scripts/afribench.py`](https://github.com/YTILIKAN/AfriBench/blob/main/scripts/afribench.py)
- Reproduction : [`scripts/reproduce.sh`](https://github.com/YTILIKAN/AfriBench/blob/main/scripts/reproduce.sh)
- Tasks `lm-eval` : `afribench` / `afribench_all`

## Dataset

- Carte : [`DATASET_CARD.md`](https://github.com/YTILIKAN/AfriBench/blob/main/data/DATASET_CARD.md)
- Splits : `african` (benchmark) + `control` (20 questions témoins non-africaines)
- Non-QCM pilotes : génération, traduction, résumé (`data/questions/v1/open/`)

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

- Français principalement (scaffolding SW/YO/AM)
- Pas encore de validation externe systématique
- Tâches ouvertes / traduction / résumé encore en mode pilot
"""
