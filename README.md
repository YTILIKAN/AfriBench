# AfriBench

> Évaluer les modèles de langage sur les réalités africaines.
> Benchmark public, ouvert, reproductible et contextuellement ancré.

[![CI](https://img.shields.io/github/actions/workflow/status/YTILIKAN/AfriBench/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/YTILIKAN/AfriBench/actions/workflows/ci.yml)
[![Evaluation script](https://img.shields.io/badge/eval-afribench.py-FFA726?style=flat-square&logo=python&logoColor=white)](scripts/afribench.py)
[![Reproduce](https://img.shields.io/badge/reproduce.sh-ready-0A192F?style=flat-square)](scripts/reproduce.sh)
[![Prototype](https://img.shields.io/badge/status-prototype%20v0.1-informational?style=flat-square)](CRITIQUE.md)
[![Docs](https://img.shields.io/badge/docs-architecture-success?style=flat-square)](docs/ARCHITECTURE.md)

**Statut : prototype v0.1** · **Documentation mise à jour :** 7 septembre 2026
**Corpus :** 350 QCM Afrique · 20 témoins · 25 tâches ouvertes pilotes · 9 amorces de traduction (sw, yo, am)
**Site :** [ytilikan.github.io/AfriBench](https://ytilikan.github.io/AfriBench/) · **Dépôt :** [github.com/YTILIKAN/AfriBench](https://github.com/YTILIKAN/AfriBench) · **Licence :** MIT

> **AfriBench est en phase de prototypage.** Les scores publics portent sur le sous-ensemble d'amorçage de 101 questions, sans validation externe, en français uniquement. Le site l'affiche ; ce README le répète. Détails : [CRITIQUE.md](CRITIQUE.md), [data/DATASET_CARD.md](data/DATASET_CARD.md).

---

## Sommaire

1. [Pourquoi ce benchmark](#pourquoi-ce-benchmark)
2. [Ce qui existe aujourd'hui](#ce-qui-existe-aujourdhui)
3. [Limites actuelles](#limites-actuelles)
4. [Comment c'est construit](#comment-cest-construit)
5. [Démarrage rapide](#démarrage-rapide)
6. [Vérifier la qualité](#vérifier-la-qualité)
7. [Contribuer](#contribuer)
8. [Catégories](#catégories)
9. [Documentation](#documentation)
10. [Feuille de route](#feuille-de-route)

---

## Pourquoi ce benchmark

Les benchmarks de référence (MMLU, HellaSwag, HumanEval) ont été écrits ailleurs : leurs questions, leurs langues et leurs présupposés sont anglo- et occidentalo-centrés. Un modèle peut y exceller et ignorer l'Empire du Mali, l'OHADA ou le rôle de Wangari Maathai.

AfriBench est un projet communautaire porté par [Y'TILIKAN](https://ytilikan.com) pour :

- **mesurer** ce que les modèles de langage savent réellement des réalités africaines francophones — histoire, géographie, droit, économie, santé, culture, société, IA ;
- **constituer** un corpus ouvert, sourcé et contributif de questions ;
- **publier** un tableau de bord lisible par tout le monde, avec ses marges d'erreur, et citable par la recherche.

> **En clair.** Un benchmark est un examen. Nous avons écrit le sujet, rédigé le règlement, convoqué les candidats (les modèles), corrigé les copies avec la même règle pour tous, et publié le palmarès — en indiquant la marge d'erreur, parce qu'un classement sans marge d'erreur est une opinion.

## Ce qui existe aujourd'hui

| Livrable | État | Chiffre clé |
|---|---|---|
| Corpus QCM ancré en Afrique | Constitué | **350** questions, 9 catégories, 99 sous-thèmes, sources citées |
| Questions témoins (calibrage) | Constitué | **20** questions non africaines, jamais mélangées au classement |
| Tâches ouvertes pilotes | Pilote (`dry_run`) | **25** items, 6 types |
| Amorces de traduction | Brouillon non officiel | **9** items (3 par langue : sw, yo, am) |
| Moteur d'évaluation CLI | Opérationnel | 3 familles d'API, **8** modèles configurés, mode simulé déterministe |
| Modèles évalués et publiés | Publié (seed 101 q.) | **7** modèles, 90,1 % – 96,0 %, podium statistiquement indécidable |
| Analyse statistique | Opérationnelle | Bootstrap 2 000 réplicats, 21 comparaisons McNemar |
| API HTTP | Opérationnelle | **35** endpoints (19 publics + 16 administration), PostgreSQL optionnel |
| Site public | En ligne | 9 vues + Question du jour, hub participatif, backoffice, sans JavaScript lisible |
| Écosystème recherche | Opérationnel | LM Evaluation Harness (11 tâches), dataset Hugging Face (370 items), Space Gradio |
| Tests automatisés | Opérationnels | **98** backend · **58** frontend · axe-core sur 9 vues × 2 thèmes · 25 paires de contraste |
| Intégration et déploiement continus | Opérationnels | 7 workflows GitHub Actions, 3 cibles de déploiement |

## Limites actuelles

| Limite | Détail | Plan |
|---|---|---|
| **Scores publics sur 101 questions** | Le corpus a triplé après la campagne d'évaluation ; les modèles n'ont pas été rejoués sur les 350 | Re-run des 8 modèles sur le corpus complet |
| **Validation externe à 0 %** | Toutes les questions ont été écrites par une seule personne ; protocole, scripts et consentement existent, pas encore les validateurs | Recrutement ([docs/VALIDATORS.md](docs/VALIDATORS.md)) |
| **Français uniquement** | Les amorces sw/yo/am sont des traductions automatiques non relues, marquées `official: false` par l'API | 50 items vérifiés par langue avant tout score |
| **QCM exclusif pour les scores officiels** | Les tâches ouvertes tournent en `dry_run` | Juge LLM calibré sur des annotations humaines |

L'autocritique complète, avec la gravité de chaque point, est publique : [CRITIQUE.md](CRITIQUE.md). Les défauts d'ingénierie, eux, sont dans l'[audit de qualité](docs/AUDIT_QUALITE.md).

---

## Comment c'est construit

Quatre étages, chacun capable de fonctionner si celui du dessous tombe. Le plan complet, avec les seize fiches de décision qui expliquent **pourquoi** chaque choix a été fait, est dans **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

```
① SOURCE DE VÉRITÉ      data/ · configs/         fichiers JSON/YAML versionnés par Git
        │
② MOTEUR & SCRIPTS      scripts/afribench.py     évaluation · validation · statistiques · exports
        │
③ SERVICE API           backend/ (FastAPI)       35 endpoints · PostgreSQL optionnel · jobs · hub · backoffice
        │
④ VITRINES              frontend/ (Vite + nginx) · hf_space/ (Gradio) · lm_eval_tasks/ · data/hf/
```

```
AfriBench/
├── backend/            API FastAPI — app/ (routeurs, services, sécurité), alembic/ (4 migrations), tests/ (98)
├── frontend/           SPA JavaScript natif bundlée par Vite, servie par nginx — js/ (noyau + 9 vues), admin/, tests/ (58)
├── data/               SOURCE DE VÉRITÉ — questions/v1/{validated,raw,witness,open,translations}, results/, stats/, hf/, lm_eval/
├── scripts/            afribench.py, reproduce.sh, stats_analysis.py, exports, validation, traduction, lm_eval_tasks/
├── configs/            models.yaml (8 modèles) · categories.yaml (9 + témoin)
├── hf_space/           Leaderboard Gradio (Hugging Face Space)
├── docs/               ARCHITECTURE · RAPPORT_TECHNIQUE · AUDIT_QUALITE · protocoles · déploiement · présentation
├── research/           Notes de cadrage, brouillon d'article
├── .github/workflows/  7 workflows (CI, Pages, Docker, HF Space)
└── docker-compose.yml · Dockerfile · railway.*.toml · CRITIQUE.md · ROADMAP.md · CONTRIBUTING.md
```

Six principes gouvernent l'ensemble : **le fichier est la vérité** (la base de données n'est qu'une copie de travail), **dégradation gracieuse** (le site fonctionne sans l'API, l'API sans la base), **reproductibilité outillée** (une commande rejoue tout), **honnêteté exécutable** (l'incertitude est un endpoint, pas une phrase), **sobriété** (pas de framework frontend, pas de file de messages) et **sécurité par défaut fermé** (un secret non configuré désactive la fonctionnalité). Chacun est détaillé dans [docs/ARCHITECTURE.md § 2](docs/ARCHITECTURE.md#2-principes-de-conception).

---

## Démarrage rapide

### Option A — Toute la plateforme avec Docker

```bash
docker compose up --build
# Site  : http://localhost:3000
# API   : http://localhost:8080/api/v1      (Swagger : http://localhost:8080/docs)
```

Démarre PostgreSQL 16, l'API (migrations Alembic puis amorçage depuis `data/`) et le site (nginx, proxy `/api` vers l'API).

### Option B — Services séparés, en développement

```bash
# Terminal 1 — API (depuis la racine du dépôt, lit .env)
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080

# Terminal 2 — site (Vite, proxy /api → :8080, rechargement à chaud)
cd frontend && npm install && npm run dev
# → http://localhost:3000
```

Sans `AFRIBENCH_DATABASE_URL`, l'API lit directement les fichiers JSON : c'est un mode de fonctionnement normal, pas un mode d'erreur.

### Option C — Le moteur seul

```bash
cp .env.example .env                       # renseigner les clés d'API des fournisseurs
./scripts/reproduce.sh --model gpt-4o      # venv, dépendances, validation, évaluation, exports
./scripts/reproduce.sh --mock              # même chaîne, sans clé ni dépense (déterministe)
./scripts/reproduce.sh --skip-eval         # exports seulement

# ou à la main
pip install -r requirements.txt
python scripts/afribench.py list-models
python scripts/afribench.py run --model gpt-4o
python scripts/afribench.py run --questions witness --model gpt-4o   # témoins, passe séparée
python scripts/afribench.py leaderboard
```

Image d'évaluation reproductible (dépendances épinglées, `PYTHONHASHSEED=0`) :

```bash
docker build -t afribench:eval .
docker run --rm --env-file .env afribench:eval run --model gpt-4o
```

### Option D — Via l'API

```bash
export AFRIBENCH_API_KEY=...               # sans elle, POST /evaluate répond 503
curl -X POST http://127.0.0.1:8080/api/v1/evaluate \
  -H "X-API-Key: $AFRIBENCH_API_KEY" -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o","limit":5}'        # → 202 {"job_id": ...}
curl -s http://127.0.0.1:8080/api/v1/jobs/<job_id>
```

### Avec l'outil standard de la communauté (LM Evaluation Harness)

```bash
pip install lm-eval
python scripts/export_lm_eval_dataset.py   # régénère data/lm_eval/
lm_eval --model openai-chat-completions --model_args model=gpt-4o \
  --tasks afribench --include_path scripts/lm_eval_tasks/ --num_fewshot 0
```

### Statistiques, exports, Space

```bash
python scripts/stats_analysis.py --results data/results/_seed_v0.1.json   # bootstrap + McNemar
python scripts/eval_open_tasks.py --dry-run                                # tâches ouvertes
python scripts/export_frontend.py && python scripts/generate_static_html.py # site : JSON + HTML pré-généré
python scripts/export_hf_dataset.py                                        # data/hf/ (--push pour publier)
pip install -r hf_space/requirements.txt && python scripts/sync_hf_space_data.py && python hf_space/app.py
```

### Déployer en production

Deux services Railway (API privée + site public) depuis ce dépôt, GitHub Pages pour la copie statique, Hugging Face pour le Space et le dataset. Guide : [docs/deploiement-railway.md](docs/deploiement-railway.md). **Derrière un proxy, `AFRIBENCH_TRUSTED_PROXY_HOPS=1` est obligatoire** (sinon le rate limiting bloque tous les visiteurs ensemble).

---

## Vérifier la qualité

Tout ce que la CI exécute se rejoue en local :

```bash
# Backend — 98 tests, et le dépôt doit rester propre après leur exécution
cd backend && PYTHONPATH=. pytest -q && git diff --exit-code

# Frontend — lint JS + CSS, audit des dépendances, 58 tests, build, contraste, accessibilité
cd frontend && npm ci && npm run lint:all && npm audit --audit-level=high && npm test
npm run build && npm run test:contrast && npm run test:a11y

# Corpus et état scientifique
python scripts/afribench.py validate data/questions/v1/validated   # schéma, réponses, identifiants uniques
python scripts/validation_status.py                                # couverture de validation externe
python scripts/submission_readiness.py                             # checklist de soumission académique
```

La CI vérifie aussi trois régressions historiques : assets Vite en chemin relatif (le site sous `/AfriBench/` se chargeait à vide), absence de gestionnaires `on*=` en ligne (incompatibles avec la CSP), et unicité des identifiants du corpus (un doublon vidait silencieusement la base). Le détail est dans [docs/ARCHITECTURE.md § 10](docs/ARCHITECTURE.md#10-qualité--tests-lint-et-garde-fous-dintégration-continue).

---

## Contribuer

AfriBench est communautaire. Cinq façons d'aider, par ordre d'impact :

1. **Valider des questions** — c'est le manque n° 1 du projet. Kit : [docs/VALIDATORS.md](docs/VALIDATORS.md), protocole : [docs/VALIDATION_PROTOCOL.md](docs/VALIDATION_PROTOCOL.md).
2. **Proposer des questions** — sur le site (vue *Participer*, vote communautaire) ou par pull request : [CONTRIBUTING.md](CONTRIBUTING.md).
3. **Traduire** — swahili, yorùbá, amharique : `data/questions/v1/translations/`, pipeline `prepare_translation_batch.py` → `apply_translations.py`.
4. **Ajouter un modèle** — une entrée dans [configs/models.yaml](configs/models.yaml) suffit pour toute API compatible OpenAI ([guide](docs/ARCHITECTURE.md#141--un-modèle)).
5. **Corriger un défaut connu** — la liste priorisée est dans [docs/AUDIT_QUALITE.md § 5](docs/AUDIT_QUALITE.md#5-ordre-de-traitement-recommandé).

### Format d'une question

```json
{
  "id": "HIST-001",
  "category": "histoire",
  "subcategory": "empires_precoloniaux",
  "difficulty": "medium",
  "language": "fr",
  "question": "Quel empire ouest-africain était réputé pour sa richesse en or et sa ville universitaire de Tombouctou au XIVe siècle ?",
  "options": { "A": "Empire du Ghana", "B": "Empire du Mali", "C": "Empire Songhaï", "D": "Royaume du Bénin" },
  "answer": "B",
  "explanation": "L'Empire du Mali, sous le règne de Mansa Moussa...",
  "source": "UNESCO Histoire Générale de l'Afrique, Vol. IV",
  "author": "",
  "date_created": "2026-06-04",
  "date_validated": null,
  "validated_by": null
}
```

`source` et `explanation` sont obligatoires : chaque corrigé doit pouvoir être contesté. `date_validated` et `validated_by` restent vides tant qu'un validateur externe n'a pas relu la question — c'est ainsi que le projet publie sa couverture de validation réelle.

---

## Catégories

| Catégorie | Préfixe d'identifiant | Périmètre |
|---|---|---|
| Histoire | `HIST` | Précoloniale, coloniale, post-coloniale |
| Géographie | `GEOG` | Physique, politique, urbaine |
| Droit et politique | `POL` | Systèmes juridiques, gouvernance, institutions régionales |
| Santé et sciences | `SANTE` | Santé publique, épidémiologie |
| Langue et culture | `LANG` | Langues africaines, littérature, arts |
| Économie | `ECON` | Développement, monnaies, numérique |
| IA et technologie | `IA` | IA et tech en Afrique |
| Société | `SOC` | Démographie, éducation, médias |
| Raisonnement culturel | `CULT` | Logique et sagesse contextuelle |

Une dixième catégorie, `temoin`, regroupe les 20 questions de contrôle non africaines ; elle n'entre jamais dans le classement.

---

## Documentation

L'index complet, avec les parcours de lecture par profil, est dans **[docs/README.md](docs/README.md)**.

| Document | Question à laquelle il répond |
|---|---|
| **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** | *Comment c'est construit, et pourquoi ainsi ?* Plan du système, 16 fiches de décision, guide d'extension, dette assumée, glossaire. |
| **[docs/RAPPORT_TECHNIQUE.md](docs/RAPPORT_TECHNIQUE.md)** | *Qu'a-t-on fait, mesuré et appris ?* Problème, mission, corpus, méthodologie, résultats et marge d'erreur, conduite du projet. Encadrés « En clair » à chaque section. |
| **[docs/AUDIT_QUALITE.md](docs/AUDIT_QUALITE.md)** | *Qu'est-ce qui a été cassé, corrigé, et reste à faire ?* Audit vérifié par exécution, défauts identifiés R1–R33, ordre de traitement. |
| [CRITIQUE.md](CRITIQUE.md) | *Quelles sont les limites scientifiques du benchmark ?* Autocritique publique. |
| [ROADMAP.md](ROADMAP.md) | *Où en est-on ?* Feuille de route cochée. |
| [backend/README.md](backend/README.md) · [frontend/README.md](frontend/README.md) · [scripts/README.md](scripts/README.md) · [data/README.md](data/README.md) · [configs/README.md](configs/README.md) | Guides pratiques par composant. |
| [docs/deploiement-railway.md](docs/deploiement-railway.md) | Déploiement en production. |
| [docs/presentation/](docs/presentation/) · [rendus/](rendus/) | Support de soutenance (32 diapositives) et PDF. |
| [research/](research/) | Notes de cadrage 01–08, brouillon d'article, checklist de soumission. |

---

## Feuille de route

Le détail, phase par phase, est dans [ROADMAP.md](ROADMAP.md).

- **Phases 1 à 4** (juin – août 2026) — **terminées** : corrections critiques, architecture services, 350 questions, témoins, pipeline de validation, multilingue, tâches ouvertes, LM Eval Harness, dataset et Space Hugging Face, HTML pré-généré, bundle Vite, tests.
- **Phase 5** (septembre 2026 →) — **en cours** : résorption de la dette identifiée par l'audit (PostgreSQL de test, sous-système d'évaluation, intégrité des mesures, observabilité), re-run des modèles sur les 350 questions, recrutement des validateurs.

---

**Y'TILIKAN** · Démocratiser l'IA · [ytilikan.com](https://ytilikan.com)
*« Le savoir, c'est le pouvoir. »* — et mesurer, c'est savoir.
