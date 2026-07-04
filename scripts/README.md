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

### Évaluation OUVERTE (LLM-as-judge)

En plus des QCM, AfriBench évalue des questions **ouvertes** (`type=open`, ex.
les SAQ médicales d'AfriMed-QA extraites dans `data/questions/afrimed/`). Le
modèle génère une réponse libre à la question, puis un **modèle juge** la note
sur 100 selon une grille explicite.

```bash
# Essai (dry-run) sur 3 questions — À FAIRE EN PREMIER avant tout run complet
python afribench.py run-open --dry-run --model gpt-4o-mini

# Éval ouverte complète d'un modèle (ou de tous si --model est omis)
python afribench.py run-open --model gpt-4o-mini
python afribench.py run-open --limit 50        # limiter le nombre de questions

# Le leaderboard affiche DEUX colonnes distinctes : QCM (%) et Ouvert (/100)
python afribench.py leaderboard
```

#### Protocole d'évaluation ouvert (afribench-judge-1.0)

| Paramètre            | Valeur                                                        |
|----------------------|--------------------------------------------------------------|
| Modèle juge (FIXE)   | **Claude Opus 4.8** (`claude-opus-4-8`, provider `anthropic`) |
| Température          | **omise** — Opus 4.8 refuse le paramètre `temperature` (HTTP 400) ; le déterminisme repose sur la grille de notation fixe et versionnée |
| Grille de notation   | **afribench-judge-1.0** (voir `judge_open.py`)               |
| Grilles disponibles  | `general_v1` (exactitude, complétude, ancrage africain, clarté) ; `medical_v1` (exactitude clinique, complétude, sécurité, ancrage africain) |
| Notation             | Chaque critère 0-5, pondéré et normalisé sur **100**          |
| Indépendance         | Le juge est **distinct des modèles évalués** (Sonnet 4 / Haiku 3.5) pour limiter le biais d'auto-préférence |

Le modèle juge est configurable dans le bloc `judge:` de `configs/models.yaml`.
Les scores ouverts sont **agrégés séparément** des QCM (jamais mélangés) et
sauvegardés dans `data/results/<modele>_open_<timestamp>.json`.

**Crédibilité** : un sous-échantillon des notes du juge devrait être
contre-noté par un·e relecteur·rice humain·e pour mesurer l'accord humain-juge.
Les `key_points` des SAQ AfriMed-QA sont vides à ce stade ; une passe ultérieure
(LLM + relecture) peut les extraire de `reference_answer` pour affiner la notation.

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
