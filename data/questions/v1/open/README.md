# Tâches non-QCM AfriBench (v0.1)

Jeux ouverts / classification pour mesurer des compétences au-delà du QCM.

## Fichiers

| Fichier | `task_type` | N | Statut |
|---------|-------------|--:|--------|
| `open_v1.json` | `open_generation` | 10 | pilot |
| `open_qa_v1.json` | `open_qa` | 3 | pilot |
| `translation_v1.json` | `translation` | 3 | pilot |
| `summarization_v1.json` | `summarization` | 3 | pilot |
| `ner_v1.json` | `ner` | 3 | pilot |
| `sentiment_v1.json` | `sentiment` | 3 | pilot |

Total pilotes non-QCM : **25** items. Non officiels tant que non validés.

## Métriques

Stubs CI (sans deps lourdes) : `scripts/metrics/text_metrics.py`

| Tâche | Métriques prévues |
|-------|-------------------|
| open / open_qa | LLM-as-judge + token F1 |
| translation | BLEU/COMET (stub `bleu_proxy`) |
| summarization | ROUGE/BERTScore (stub `rouge_l_proxy`) |
| ner | entity F1 |
| sentiment | accuracy / macro-F1 |

## Évaluer (génération / QA / traduction / résumé)

```bash
python scripts/judges/llm_as_judge.py \
  --responses data/results/open_responses.jsonl \
  --out data/results/open_judgements.jsonl --dry-run
```

Contrôle humain recommandé sur ≥20 % des jugements.
