# AfriBench — LM Evaluation Harness

## Installation

```bash
pip install lm-eval
```

## Utilisation

```bash
# Depuis la racine du repo AfriBench
lm-eval --model openai-chat-completions \
  --model_args model=gpt-4o \
  --tasks afribench \
  --include_path scripts/lm_eval_tasks/ \
  --num_fewshot 0

# Avec un modèle local (GGUF, transformers)
lm-eval --model local-completions \
  --model_args model=/path/to/model \
  --tasks afribench \
  --include_path scripts/lm_eval_tasks/
```

## Structure

```
lm_eval_tasks/afribench/
├── afribench.yaml     # Configuration de la tâche (multiple_choice)
└── utils.py           # Fonctions doc_to_text, doc_to_choice

Les questions sont chargées depuis data/questions/v1/validated/*.json
```

## Format attendu des questions

Le format JSON est défini dans `data/questions/template.json`.
