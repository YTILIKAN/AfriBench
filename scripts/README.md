# AfriBench — Scripts (moteur d'évaluation et outillage)

Ce dossier contient le **cœur scientifique** du projet (`afribench.py`), la reproduction bout-en-bout (`reproduce.sh`), les statistiques, les exports vers le site et l'écosystème de recherche, les pipelines de validation externe et de traduction, et l'intégration LM Evaluation Harness.

> Ce README dit **quoi lancer et avec quelles options**. Les conditions d'examen (prompt, température, extraction de réponse, mode simulé) et leurs justifications sont dans [`docs/ARCHITECTURE.md § 5`](../docs/ARCHITECTURE.md#5-le-moteur-dévaluation) et [§ 8](../docs/ARCHITECTURE.md#8-la-chaîne-de-publication-et-les-exports).

**Inventaire (7 septembre 2026) :** 21 scripts Python · 3 scripts shell · 11 tâches YAML lm-eval · 2 854 lignes de Python. Tous s'exécutent **depuis la racine du dépôt** (`python scripts/<nom>.py`), Python ≥ 3.10.

---

## Sommaire

- [Installation](#installation)
- [reproduce.sh — tout en une commande](#reproducesh--tout-en-une-commande)
- [afribench.py — le moteur](#afribenchpy--le-moteur)
- [Les scripts, par famille](#les-scripts-par-famille)
- [Chaîne de publication](#chaîne-de-publication)
- [LM Evaluation Harness](#lm-evaluation-harness)
- [Fournisseurs et clés d'API](#fournisseurs-et-clés-dapi)
- [Conventions](#conventions)

---

## Installation

```bash
pip install -r requirements.txt          # pyyaml + requests : suffisant pour afribench.py et la plupart des scripts
pip install -r requirements-eval.txt     # versions épinglées, utilisées par l'image Docker d'évaluation
cp .env.example .env                     # clés d'API des fournisseurs (lues par reproduce.sh et afribench.py)
```

Image reproductible (dépendances épinglées, `PYTHONHASHSEED=0`, `AFRIBENCH_SEED=42`) :

```bash
docker build -t afribench:eval .
docker run --rm --env-file .env afribench:eval run --model gpt-4o
docker compose --profile eval run --rm eval run --model gpt-4o
```

## reproduce.sh — tout en une commande

Crée un environnement virtuel, installe les dépendances, charge `.env`, **valide le corpus**, évalue, puis régénère les exports du site.

```bash
./scripts/reproduce.sh                       # tous les modèles configurés
./scripts/reproduce.sh --model gpt-4o        # un modèle (tout argument inconnu est transmis à afribench.py run)
./scripts/reproduce.sh --mock                # sans clé ni dépense : réponses simulées déterministes
./scripts/reproduce.sh --skip-eval           # exports seulement (export_frontend.py)
```

## afribench.py — le moteur

Script **autonome** (772 lignes, deux dépendances) utilisé par trois chemins qui doivent produire des chiffres identiques : la ligne de commande, le backend (import dynamique par `services/evaluate.py`) et — pour le protocole — la tâche LM Evaluation Harness.

```bash
python scripts/afribench.py list-models
python scripts/afribench.py run          [--model NOM] [--questions v1|witness] [--few-shot N] [--mock] [--verbose]
python scripts/afribench.py leaderboard  [--top-n N] [--include-mock]
python scripts/afribench.py validate     [CHEMIN]          # défaut : data/questions/v1 (tous les sous-dossiers)
python scripts/afribench.py export       [--format json|csv|markdown]
```

### Ce que fait `run`

| Étape | Comportement |
|---|---|
| Corpus | `--questions v1` (défaut) charge `data/questions/v1/validated/` ; `witness` charge les 20 témoins, **passe séparée**, jamais mélangée au classement |
| Few-shot | Les `N` premiers exemples sont **retirés** du jeu évalué (`--few-shot 3` évalue 347 questions, pas 350) |
| Prompt | Identique pour tous les modèles : consigne stricte « répondez uniquement par la lettre », question, quatre options, `Réponse :` |
| Conditions | `temperature: 0.0`, `max_tokens: 256` (depuis `configs/models.yaml`), 0,5 s entre deux questions, 60 s de délai réseau |
| Réessais | 5 tentatives ; attentes 2/3/5/9 s en général, 5/15/25/35 s sur HTTP 429 |
| Correction | `extract_answer` : quatre motifs ancrés, du plus strict au plus permissif ; toute réponse ambiguë devient `no_answer` (ni juste ni fausse, comptée à part, réponse brute conservée dans `details[].unparsed_response`) |
| Sortie | `data/results/<modèle>_<horodatage>.json` : `accuracy`, `by_category`, `by_difficulty`, `details` ligne à ligne, `mock` |

### Le mode simulé (`--mock`)

Réponses déterministes (graine dérivée du SHA-256 du nom du modèle, accuracy cible dans [0,62 ; 0,94], biais par difficulté), écrites dans **`data/results/mock/`** avec le préfixe `mock_` et le champ `"mock": true`, **exclues du classement** sauf `--include-mock`. Il exerce toute la chaîne sans clé ; c'est ce que la CI utilise.

### `validate` : les invariants du corpus

Champs obligatoires, `answer` parmi les options, catégorie connue de `categories.yaml`, difficulté dans `{easy, medium, hard}`, **identifiants uniques sur tout le corpus** (un doublon faisait échouer silencieusement le seed PostgreSQL et laissait la base vide). Exécuté en CI à chaque commit.

## Les scripts, par famille

### Moteur et statistiques

| Script | Rôle | Options |
|---|---|---|
| `afribench.py` | Évaluer, classer, valider, exporter | voir ci-dessus |
| `reproduce.sh` | Reproduction bout-en-bout | `--mock`, `--skip-eval`, reste transmis à `run` |
| `stats_analysis.py` | Intervalles de confiance à 95 % par **bootstrap** (2 000 réplicats, graine dérivée du nom du modèle), **test de McNemar** apparié pour chaque paire de modèles, verdict de chevauchement du podium → `data/stats/<nom>_report.json` | `--results`, `--include-mock`, `--n-boot`, `--out` |

```bash
python scripts/stats_analysis.py --results data/results/_seed_v0.1.json
# Sur le seed : 2 comparaisons significatives sur 21 ; podium indécidable.
```

### Exports vers le site

| Script | Produit | Lu par |
|---|---|---|
| `export_frontend.py` | `frontend/data/results.json`, `frontend/data/questions.json` | Site en mode statique, `generate_static_html.py` |
| `generate_static_html.py` | Classement injecté dans `frontend/index.html` (`<!-- STATIC_LEADERBOARD_BEGIN/END -->`), `<noscript>` enrichi, `frontend/data/bootstrap.json` | Moteurs de recherche, premier rendu |
| `aggregate_open_scores.py` | `frontend/data/open_scores.json` | Vue *Tâches ouvertes* |

### Écosystème de recherche

| Script | Rôle | Options |
|---|---|---|
| `export_hf_dataset.py` | `data/hf/YTILIKAN__AfriBench/` : `african.jsonl` (350), `control.jsonl` (20), `README.md` (carte), `dataset_info.json` | `--out`, `--push` (jeton HF requis) |
| `export_lm_eval_dataset.py` | `data/lm_eval/afribench.json` + un fichier par catégorie + `manifest.json` | — |
| `sync_hf_space_data.py` | Copie les données du site vers `hf_space/data/` | — |
| `deploy_hf_space.sh` | Prépare (et avec `--push`, publie) le Space Gradio | `--push` |
| `publish_artifacts.sh` | Enchaîne export frontend, traductions, dry-run ouvert, agrégation, statistiques, synchronisation du Space et mise à jour de la checklist | `--push-hf` (publie aussi le Space) |
| `submission_readiness.py` | Checklist de soumission académique (exécutée en CI) | `--update-checklist` |

### Validation externe

| Script | Rôle | Options |
|---|---|---|
| `prepare_validation_batch.py` | Lot **stratifié à graine fixée** au format JSONL pour un validateur | `--size`, `--seed`, `--validator`, `--exclude-validated`, `--out` |
| `apply_validations.py` | Applique les verdicts d'un lot (`date_validated`, `validated_by`) | `--batch`, `--dry-run`, `--export` |
| `compute_inter_annotator.py` | **κ de Cohen** entre deux lots qui se recouvrent | `--batch-a`, `--batch-b`, `--out` |
| `validation_status.py` | Couverture de validation par catégorie (exécuté en CI ; même calcul que `GET /api/v1/validation/status`) | `--json`, `--markdown` |

Protocole : [`docs/VALIDATION_PROTOCOL.md`](../docs/VALIDATION_PROTOCOL.md). Les lots vivent dans `data/validation/` (ignorés par Git).

### Multilingue

| Script | Rôle | Options |
|---|---|---|
| `prepare_translation_batch.py` | Lot de questions à traduire (`sw`, `yo`, `am`) | `--lang`, `--size`, `--seed`, `--translator`, `--out` |
| `apply_translations.py` | Écrit les traductions dans `data/questions/v1/translations/<lang>/` avec `translation_status` | `--lang`, `--batch`, `--dry-run` |
| `export_translations.py` | Export d'une langue, **non officiel** tant que moins de 50 items ne sont pas `verified` | `--lang`, `--verified-only` |

### Tâches ouvertes (hors QCM)

| Script | Rôle | Options |
|---|---|---|
| `eval_open_tasks.py` | Évalue les 25 items de `data/questions/v1/open/` ; en `--dry-run`, les scores sont marqués `dry_run: true` | `--dry-run`, `--out` |
| `judges/llm_as_judge.py` | Juge LLM à grille (`rubric`) sur des réponses JSONL | `--responses`, `--out`, `--judge-model`, `--dry-run` |
| `metrics/text_metrics.py` | Métriques textuelles proxy (module, sans dépendance lourde) | — |

```bash
python scripts/eval_open_tasks.py --dry-run
python scripts/judges/llm_as_judge.py --responses responses.jsonl --out judgements.jsonl --dry-run
```

## Chaîne de publication

```
afribench.py run ──► data/results/*.json ──► export_frontend.py ──► frontend/data/{results,questions}.json
                            │                                              │
                            └──► stats_analysis.py ──► data/stats/         ├──► generate_static_html.py ──► index.html + bootstrap.json
                                                                           │                                        │
eval_open_tasks.py --dry-run ──► aggregate_open_scores.py ──► open_scores.json                                       ▼
                                                                           └──► sync_hf_space_data.py ──► hf_space/data/     npm run build ──► dist/
                                                                                        │
                                                                                        └──► deploy_hf_space.sh --push ──► Space Gradio
```

Le workflow `deploy-pages.yml` exécute cette chaîne à chaque push sur `main`. En local, `reproduce.sh --skip-eval` couvre la partie site.

## LM Evaluation Harness

Onze tâches YAML dans `lm_eval_tasks/afribench/` : `afribench` (350 items), `afribench_all` (groupe) et `afribench_<catégorie>` × 9. `utils.py` reproduit **exactement** le prompt de `afribench.py` (`doc_to_text`, `doc_to_choice`, `doc_to_target`) : un tiers peut exécuter AfriBench avec l'outil de référence sans nous faire confiance.

```bash
pip install lm-eval
python scripts/export_lm_eval_dataset.py       # régénère data/lm_eval/
lm_eval --model openai-chat-completions --model_args model=gpt-4o \
  --tasks afribench --include_path scripts/lm_eval_tasks/ --num_fewshot 0
lm_eval ... --tasks afribench_histoire          # une catégorie
```

Détails : [`lm_eval_tasks/afribench/README.md`](lm_eval_tasks/afribench/README.md).

## Fournisseurs et clés d'API

Trois fonctions d'appel couvrent les huit modèles configurés, grâce à la compatibilité de facto de l'API OpenAI :

| `provider` | Modèles configurés (`configs/models.yaml`) | Variable d'environnement | Authentification |
|---|---|---|---|
| `openai` | GPT-4o, GPT-4o Mini | `OPENAI_API_KEY` | `Authorization: Bearer` |
| `openai` + `api_base` | Mistral Large, DeepSeek V4, Llama 3.1 70B (Together) | `MISTRAL_API_KEY`, `DEEPSEEK_API_KEY`, `TOGETHER_API_KEY` | idem |
| `anthropic` | Claude Sonnet 4, Claude Haiku 4.5 | `ANTHROPIC_API_KEY` | `x-api-key` |
| `google` | Gemini 2.5 Flash | `GEMINI_API_KEY` | en-tête `x-goog-api-key` — **jamais en query string** (une clé en URL finissait dans les messages d'erreur exposés) |

Résolution de la clé : `model["api_key"]` (saisie dans le backoffice, déchiffrée depuis la base) puis la variable `api_key_env`. Ajouter un fournisseur compatible OpenAI ne demande **aucun code** : une entrée YAML avec `provider: openai` et `api_base` ([guide](../configs/README.md)).

## Conventions

- **Exécution depuis la racine** : les chemins (`data/`, `configs/`, `frontend/data/`) sont relatifs au dépôt.
- **Déterminisme** : tout tirage aléatoire (lots, bootstrap, mock) prend une graine explicite ou dérivée d'un nom ; `AFRIBENCH_SEED` dans l'image Docker.
- **Rien de simulé ne se mélange au réel** : `mock/` séparé, `dry_run: true`, `official: false` — le code l'impose, pas seulement la documentation.
- **Tolérance aux fichiers malformés** : un JSON invalide dans le corpus est journalisé et ignoré, il ne fait pas planter la chaîne.
- **Pas encore de lint Python** en CI (audit R27) : `ruff` est le candidat ; en attendant, respecter le style des fichiers existants (docstrings en français, `pathlib`, `argparse`).

---

Documents liés : [Architecture § 5 et § 8](../docs/ARCHITECTURE.md#5-le-moteur-dévaluation) · [Rapport technique § 6 et § 20](../docs/RAPPORT_TECHNIQUE.md#6-la-méthodologie--le-règlement-dexamen) · [configs/README](../configs/README.md) · [data/README](../data/README.md) · [Index de la documentation](../docs/README.md)
