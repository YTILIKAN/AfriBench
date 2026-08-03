# Questions ouvertes AfriBench (v0.1)

10 tâches de **génération** (pas de QCM) pour évaluer synthèse, comparaison et analyse
sur des sujets africains.

## Fichier

- `open_v1.json` — questions + `reference_points` + `rubric`

## Grille LLM-as-judge

| Critère | Max | Description |
|---------|-----|-------------|
| `exactitude` | 4 | Faits corrects, pas d'hallucination majeure |
| `profondeur` | 3 | Analyse / articulation des causes |
| `nuance_culturelle` | 3 | Évite stéréotypes ; reconnaît la diversité |

Score total /10.

## Évaluer

```bash
# 1) Produire des réponses modèle (JSONL)
# {"id":"OPEN-001","model":"gpt-4o","response":"..."}

# 2) Juger
export OPENAI_API_KEY=...
python scripts/judges/llm_as_judge.py \
  --responses data/results/open_responses.jsonl \
  --out data/results/open_judgements.jsonl

# Dry-run (sans API)
python scripts/judges/llm_as_judge.py \
  --responses examples.jsonl --out /tmp/j.jsonl --dry-run
```

Contrôle humain recommandé sur un échantillon (≥20 %) des jugements.
