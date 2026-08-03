---
language:
- fr
license: other
task_categories:
- multiple-choice
- question-answering
pretty_name: AfriBench
tags:
- african
- benchmark
- french
- qcm
- multiple-choice
- africa
size_categories:
- n<1K
---

# AfriBench

Benchmark public pour évaluer les modèles de langage sur les **réalités africaines**
(histoire, géographie, culture, droit, santé, économie, IA, société).

Porté par [YTILIKAN](https://ytilikan.com) · repo : [YTILIKAN/AfriBench](https://github.com/YTILIKAN/AfriBench)

> **Statut : prototype v0.1** — l'échantillon reste trop petit pour des conclusions
> statistiquement fortes. Les scores sont indicatifs.

## Splits

| Split | Description | N |
|-------|-------------|---|
| `african` | Questions ancrées Afrique (benchmark principal) | 156 |
| `control` | Questions témoins non-africaines (baseline) | 20 |

## Schéma

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | string | Identifiant (ex. `HIST-001`) |
| `category` | string | Catégorie thématique |
| `subcategory` | string | Sous-thème |
| `difficulty` | string | `easy` / `medium` / `hard` |
| `language` | string | Code langue (`fr`) |
| `question` | string | Énoncé |
| `option_a`…`option_d` | string | Propositions |
| `answer` | string | Lettre correcte (`A`–`D`) |
| `explanation` | string | Justification |
| `source` | string | Référence |
| `is_control` | bool | `true` pour les témoins |
| `date_created` | string | Date ISO |

## Répartition (split `african`)

### Par catégorie

| Catégorie | N |
|-----------|---|
| droit_politique | 16 |
| economie | 16 |
| geographie | 21 |
| histoire | 21 |
| ia_technologie | 16 |
| langue_culture | 18 |
| raisonnement_culturel | 16 |
| sante_sciences | 16 |
| societe | 16 |

### Par difficulté

| Difficulté | N |
|------------|---|
| easy | 46 |
| hard | 52 |
| medium | 58 |

## Chargement

```python
from datasets import load_dataset

# Après publication sur le Hub :
# ds = load_dataset("YTILIKAN/AfriBench")

# En local :
from pathlib import Path
import json

def load_jsonl(path):
    with open(path, encoding="utf-8") as f:
        return [json.loads(line) for line in f]

african = load_jsonl("african.jsonl")
control = load_jsonl("control.jsonl")
```

## Citation

```bibtex
@misc{afribench2026,
  title  = {{AfriBench: Evaluating Language Models on African Realities}},
  author = {{YTILIKAN}},
  year   = {{2026}},
  url    = {{https://github.com/YTILIKAN/AfriBench}},
  note   = {{Prototype v0.1 — 176 items (156 african + 20 control)}}
}
```

## Licence / contribution

Voir le dépôt GitHub. Contributions de questions et validations bienvenues.
Carte générée le 2026-08-03.
