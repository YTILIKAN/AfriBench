# AfriBench — LM Evaluation Harness

Tâches EleutherAI `lm-eval` pour le benchmark AfriBench.

## Prérequis

```bash
pip install lm-eval
# Dataset aplati (déjà versionné sous data/lm_eval/, régénérable) :
python scripts/export_lm_eval_dataset.py
```

## Commandes

```bash
# Toutes les questions
lm_eval --model openai-chat-completions \
  --model_args model=gpt-4o \
  --tasks afribench \
  --include_path scripts/lm_eval_tasks/ \
  --num_fewshot 0

# Toutes les catégories (groupe)
lm_eval --model openai-chat-completions \
  --model_args model=gpt-4o \
  --tasks afribench_all \
  --include_path scripts/lm_eval_tasks/ \
  --num_fewshot 0

# Une catégorie
lm_eval --model hf \
  --model_args pretrained=gpt2 \
  --tasks afribench_histoire \
  --include_path scripts/lm_eval_tasks/ \
  --num_fewshot 0 \
  --limit 5
```

## Tâches disponibles

| Task | Description |
|------|-------------|
| `afribench` | 300 questions (toutes catégories) |
| `afribench_all` | Groupe des 9 sous-tâches catégorie |
| `afribench_<cat>` | Une catégorie (`histoire`, `geographie`, …) |

## Structure

```
lm_eval_tasks/afribench/
├── afribench.yaml              # task globale
├── afribench_all.yaml          # group
├── afribench_<category>.yaml   # 9 catégories
└── utils.py                    # doc_to_text / choice / target

data/lm_eval/
├── afribench.json
├── afribench_<category>.json
└── manifest.json
```

Les prompts sont alignés sur `scripts/afribench.py` (zero-shot, réponse lettre A–D).
