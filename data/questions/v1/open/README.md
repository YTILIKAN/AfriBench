# Tâches non-QCM AfriBench (v0.1)

Jeux ouverts pour mesurer synthèse, traduction et résumé — complémentaires au QCM.

## Fichiers

| Fichier | `task_type` | N | Statut |
|---------|-------------|--:|--------|
| `open_v1.json` | `open_generation` (implicite) | 10 | pilot |
| `translation_v1.json` | `translation` | 3 | pilot (réfs à valider) |
| `summarization_v1.json` | `summarization` | 3 | pilot |

Chaque item porte `reference_points` + `rubric` pour LLM-as-judge.
Les tâches traduction/résumé restent **non officielles** tant que les références
n'ont pas été validées par des locuteurs / annotateurs.

## Grille LLM-as-judge

| Critère | Max | Description |
|---------|-----|-------------|
| `exactitude` | 4 | Faits corrects, pas d'hallucination majeure |
| `profondeur` | 3 | Analyse / couverture des points clés |
| `nuance_culturelle` | 3 | Évite stéréotypes ; reconnaît la diversité |

Score total /10.

Métriques automatiques prévues (non branchées) : BLEU/COMET (traduction), ROUGE/BERTScore (résumé).

## Évaluer

```bash
# 1) Produire des réponses modèle (JSONL)
# {"id":"OPEN-001","model":"gpt-4o","response":"..."}
# {"id":"TR-001","model":"gpt-4o","response":"..."}
# {"id":"SUM-001","model":"gpt-4o","response":"..."}

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
