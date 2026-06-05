# Scripts — AfriBench

## afribench.py (script principal)

Script autonome pour évaluer les LLMs sur AfriBench.

### Installation

```bash
pip install pyyaml requests
```

### Utilisation

```bash
# Lister les modèles configurés
python afribench.py list-models

# Évaluer tous les modèles
python afribench.py run

# Évaluer un modèle spécifique
python afribench.py run --model gpt-4o

# Avec 3 exemples few-shot
python afribench.py run --few-shot 3

# Mode verbose (affiche chaque question)
python afribench.py run --verbose

# Afficher le leaderboard
python afribench.py leaderboard

# Exporter les résultats
python afribench.py export --format csv
python afribench.py export --format markdown

# Valider les fichiers questions
python afribench.py validate data/questions/v1/
```

### Configuration

- `../configs/models.yaml` — Modèles à évaluer (provider, clé API, paramètres)
- `../configs/categories.yaml` — Catégories de questions

Les clés API sont lues depuis les variables d'environnement :
- `OPENAI_API_KEY` — OpenAI (GPT-4o, GPT-4o-mini)
- `ANTHROPIC_API_KEY` — Anthropic (Claude)
- `MISTRAL_API_KEY` — Mistral AI
- `GEMINI_API_KEY` — Google Gemini
- `DEEPSEEK_API_KEY` — DeepSeek
- `TOGETHER_API_KEY` — Together (Llama, open models)

### Providers supportés

| Provider | Modèles | Variable d'env |
|----------|---------|----------------|
| openai | GPT-4o, GPT-4o-mini | `OPENAI_API_KEY` |
| anthropic | Claude Sonnet 4, Haiku 3.5 | `ANTHROPIC_API_KEY` |
| google | Gemini 2.0 Flash | `GEMINI_API_KEY` |
| openai (compatible) | Mistral, DeepSeek, Together, etc. | selon le service |

## lm_eval_tasks/ (intégration LM Evaluation Harness)

Pour utiliser AfriBench avec le framework standard EleutherAI :

```bash
pip install lm-eval
lm-eval --model openai-chat-completions \
  --model_args model=gpt-4o \
  --tasks afribench \
  --include_path scripts/lm_eval_tasks/
```

Voir `lm_eval_tasks/afribench/README.md` pour plus de détails.
