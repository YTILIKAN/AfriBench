# AfriBench — Backend (service API)

API HTTP en **FastAPI** (Python 3.12) qui expose le benchmark en lecture, pilote des campagnes d'évaluation par jobs, héberge le hub de propositions communautaires et sert le backoffice.

> Ce README est le guide pratique du service. La conception — pourquoi PostgreSQL est optionnel, pourquoi des threads plutôt qu'une file de messages, pourquoi 503 plutôt que 401 — est expliquée dans [`docs/ARCHITECTURE.md § 6`](../docs/ARCHITECTURE.md#6-le-service-api-backend) et dans ses fiches de décision. Les défauts connus sont dans [`docs/AUDIT_QUALITE.md`](../docs/AUDIT_QUALITE.md).

**Chiffres (7 septembre 2026) :** 35 endpoints sous `/api/v1` (19 publics, 16 administration) · 7 tables · 4 migrations Alembic · 27 réglages · 98 tests dans 18 fichiers · 2 886 lignes dans `app/`.

---

## Sommaire

- [Démarrage](#démarrage)
- [Structure](#structure)
- [Endpoints publics](#endpoints-publics)
- [Endpoints d'administration](#endpoints-dadministration)
- [Configuration](#configuration)
- [Base de données](#base-de-données)
- [Jobs d'évaluation](#jobs-dévaluation)
- [Sécurité](#sécurité)
- [Tests](#tests)
- [Dépannage](#dépannage)

---

## Démarrage

```bash
# Depuis la racine du dépôt : le service lit .env à la racine et data/, configs/, scripts/
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
# Swagger : http://127.0.0.1:8080/docs · ReDoc : /redoc
```

Ou avec toute la plateforme (PostgreSQL 16 + API + site) :

```bash
docker compose up --build
```

Sans `AFRIBENCH_DATABASE_URL`, le service lit les fichiers JSON de `data/` et fonctionne en lecture complète ; seuls le hub participatif (503 explicite) et la persistance des jobs sont indisponibles. C'est un mode normal, pas un mode d'erreur.

## Structure

```
backend/
├── app/
│   ├── main.py            Application, cycle de vie (migrations → seed → reprise des jobs), CORS, routeurs
│   ├── config.py          Settings pydantic-settings — 27 champs, préfixe AFRIBENCH_
│   ├── db.py              Engine SQLAlchemy (pool_pre_ping), sessions, exécution d'Alembic
│   ├── models.py          7 tables ORM (SQLAlchemy 2)
│   ├── schemas.py         Contrats Pydantic v2 (entrées bornées, Literal)
│   ├── repository.py      Toute la couche SQL : CRUD, seed versionné, jobs, verrou, chiffrement des clés
│   ├── security.py        client_ip (proxys de confiance), enforce_rate_limit, require_api_key
│   ├── rate_limit.py      Backends mémoire / PostgreSQL / Redis, façade « auto »
│   ├── admin_auth.py      Jetons de session HMAC-SHA256, require_admin
│   ├── redaction.py       Masquage des secrets dans les messages d'erreur exposés
│   ├── routers/v1.py      19 endpoints publics
│   ├── routers/admin.py   16 endpoints d'administration (préfixe /admin)
│   └── services/
│       ├── data_loader.py Lecture JSON tolérante, cache LRU, agrégations
│       ├── evaluate.py    Jobs : création, thread, verrou, reprise ; import dynamique de scripts/afribench.py
│       └── open_tasks.py  Tâches ouvertes, traductions, statut de validation
├── alembic/versions/      001_baseline · 002_durable_jobs · 003_seed_version · 004_question_proposals
├── tests/                 18 fichiers, 98 tests (pytest)
├── Dockerfile             python:3.12-slim, HEALTHCHECK sur /api/v1/health, écoute $PORT
└── requirements.txt
```

Règle de découpage : **les routeurs ne contiennent pas de logique** — ils valident (Pydantic), délèguent (`services/`, `repository.py`) et traduisent les erreurs en codes HTTP. `data_loader.py` ne connaît pas SQL ; `repository.py` ne connaît pas HTTP.

## Endpoints publics

Préfixe `/api/v1`. Tous soumis au rate limiting (budget lecture ou écriture, § Sécurité).

| Méthode | Chemin | Auth | Rôle · paramètres |
|---|---|---|---|
| GET | `/health` | — | Sonde de vie → `{"status":"ok"}` (ne teste pas la base, cf. audit R6) |
| GET | `/results` | — | Résultats **sans** `details` · `model`, `category`, `limit` ≤ 1000 |
| GET | `/questions` | — | Corpus QCM · `category`, `difficulty`, `limit` ≤ 500 |
| GET | `/models` | — | Un score agrégé par modèle (dernier run) · `sort`, `open` |
| GET | `/models/configured` | — | Modèles évaluables (base si active, sinon `models.yaml`), avec `api_key_set` |
| GET | `/stats` | — | Totaux, top, moyenne, couverture de validation, traductions, tâches ouvertes |
| GET | `/leaderboard` | — | `models` + `category_averages` + `stats` |
| GET | `/validation/status` | — | Couverture de validation externe (actuellement 0 %) |
| GET | `/translations` | — | Items d'une langue · `lang` ∈ {`sw`, `yo`, `am`} requis · `verified_only` |
| GET | `/translations/manifest` | — | Totaux par langue + drapeau `official` (vrai à partir de 50 items vérifiés) |
| GET | `/open/tasks` | — | Tâches ouvertes · `task_type`, `limit` ≤ 200 |
| GET | `/open/scores` | — | Scores non-QCM, marqués `dry_run` le cas échéant |
| GET | `/proposals` | PostgreSQL requis | Hub · `sort` ∈ {`needs_votes`, `popular`, `new`} · en-tête `X-Voter-ID` optionnel |
| POST | `/proposals` | PostgreSQL requis | Soumettre une proposition (schéma strict, 409 si doublon `pending`) |
| POST | `/proposals/{id}/vote` | PostgreSQL requis | Voter `+1` / `-1`, révocable |
| POST | `/evaluate` | `X-API-Key` | Lancer un job → **202** `{job_id}` |
| GET | `/jobs/{job_id}` | — | Statut d'un job |
| GET | `/jobs` | — | Jobs récents · `limit` ≤ 100 |
| POST | `/reload` | `X-API-Key` | Invalider le cache et relire le disque |

### Lancer une évaluation

```bash
export AFRIBENCH_API_KEY=...       # obligatoire : sans elle, /evaluate et /reload répondent 503
export OPENAI_API_KEY=sk-...       # clé du fournisseur, ou saisie dans le backoffice (chiffrée en base)

curl -X POST http://127.0.0.1:8080/api/v1/evaluate \
  -H "X-API-Key: $AFRIBENCH_API_KEY" -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o","few_shot":0,"limit":5,"category":null,"sync":false}'
# → 202 {"job_id":"…","status":"queued"}

curl -s http://127.0.0.1:8080/api/v1/jobs/<job_id> | jq .
```

Corps `EvaluateRequest` : `model` (nom dans `configs/models.yaml`), `few_shot` 0–10, `limit` 1–500 ou `null` (toutes), `category` optionnelle, `sync` (bloquant, **autorisé seulement si `limit ≤ 20`**).

## Endpoints d'administration

Préfixe `/api/v1/admin`. Authentification par jeton porteur (`Authorization: Bearer <jeton>`) obtenu via `/login`. Activé uniquement si `AFRIBENCH_ADMIN_PASSWORD` est défini (sinon **503**).

| Ressource | Méthodes | Notes |
|---|---|---|
| `/login` | POST | `{password}` → `{token, expires_in}` · budget dédié **5 tentatives / 15 min** par IP |
| `/questions` · `/questions/{qid}` | GET · POST · PUT · DELETE | Toute écriture pose `locked_by_admin = true` : le seed ne réécrasera pas la question |
| `/proposals` · `/proposals/{id}/status` | GET · PUT | Modération : `pending` → `accepted` \| `rejected` |
| `/results` · `/results/{rid}` | GET · POST · PUT · DELETE | Scores publiés |
| `/models` · `/models/{name}` | GET · POST · PUT · DELETE | Clé d'API chiffrée Fernet ; jamais renvoyée au client (`api_key_set: bool`) |
| `/evaluate` | POST | Même mécanique que le public, authentification par session |

Le backoffice web (`frontend/admin/`) consomme ces endpoints ; il est servi avec `X-Robots-Tag: noindex`.

## Configuration

Toutes les variables portent le préfixe `AFRIBENCH_` et sont lues depuis l'environnement ou le fichier `.env` à la racine du dépôt (voir [`.env.example`](../.env.example)).

| Groupe | Variable | Défaut | Effet |
|---|---|---|---|
| Exposition | `CORS_ORIGINS` | `*` | Liste d'origines séparées par des virgules. À restreindre dès qu'un secret est défini. |
| Secrets | `API_KEY` | vide | Active `POST /evaluate` et `POST /reload`. Vide = **503**. |
| | `ADMIN_PASSWORD` | vide | Active le backoffice. Vide = **503**. Changer le mot de passe invalide toutes les sessions. |
| | `ENCRYPTION_KEY` | vide | Clé Fernet (`python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`) pour chiffrer les clés d'API en base. |
| | `ADMIN_SESSION_TTL` | `43200` | Durée de vie d'une session backoffice (s), soit 12 h. |
| Persistance | `DATABASE_URL` | vide | `postgresql://…` (réécrit en `postgresql+psycopg://`). Vide = mode fichiers. |
| | `REDIS_URL` | vide | Backend Redis pour le rate limiting distribué. |
| Débit | `RATE_LIMIT_READ` / `_READ_WINDOW` | `120` / `60` | Lecture : 120 requêtes par 60 s et par `IP:chemin` |
| | `RATE_LIMIT_WRITE` / `_WRITE_WINDOW` | `10` / `60` | Écriture (`/evaluate`, `/reload`, `/proposals`…) |
| | `RATE_LIMIT_LOGIN` / `_LOGIN_WINDOW` | `5` / `900` | `/admin/login` |
| | `RATE_LIMIT_BACKEND` | `auto` | `auto` (Redis → PostgreSQL → mémoire), `memory`, `postgres`, `redis` |
| Réseau | `TRUSTED_PROXY_HOPS` | `0` | Nombre de proxys de confiance devant le service. **`1` derrière Railway ou nginx**, sinon tous les visiteurs partagent l'IP du proxy. |
| Serveur | `HOST` / `PORT` | `0.0.0.0` / `8080` | Le Dockerfile écoute `$PORT`. |
| Identité | `APP_NAME` / `API_PREFIX` | `AfriBench API` / `/api/v1` | — |
| Chemins | `DATA_DIR`, `RESULTS_DIR`, `RESULTS_FALLBACK`, `QUESTIONS_DIR`, `QUESTIONS_MANIFEST`, `QUESTIONS_WITNESS_DIR`, `TRANSLATIONS_DIR`, `OPEN_TASKS_DIR` | sous `data/` | Six de ces chemins sont déclarés mais **pas encore lus** par le code (audit R30). |

Principe : **un secret absent désactive la fonctionnalité** (503 avec message actionnable). Aucune valeur par défaut du type `change-me`.

## Base de données

PostgreSQL est **optionnel**. Quand `AFRIBENCH_DATABASE_URL` est défini, le cycle de vie du service enchaîne au démarrage :

1. `alembic upgrade head` — les 4 migrations sont idempotentes (test d'existence avant `CREATE`/`ALTER`) ;
2. `seed()` — les questions de `data/questions/v1/validated/` et le résultat `data/results/_seed_v0.1.json` sont insérés par **upsert conditionnel** : une question en base n'est remplacée que si `seed_version` du fichier (`data/questions/v1/manifest.json`) est **strictement supérieure** et si `locked_by_admin` est faux ;
3. `seed_models()` — `configs/models.yaml` → table `models`, sans écraser une clé saisie dans le backoffice ;
4. `recover_stale_jobs()` puis `resume_queued_jobs()` — les jobs `running` orphelins passent `failed`, les `queued` sont relancés.

Si l'une de ces étapes échoue, l'erreur est journalisée et **le service démarre quand même** en mode fichiers.

| Table | Rôle |
|---|---|
| `questions` | Copie de travail du corpus (`seed_version`, `locked_by_admin`, `is_control`, `options` JSONB) |
| `results` | Résultats (`by_category`, `by_difficulty`, `details` JSONB ; unicité `(model, timestamp)`) |
| `models` | Modèles configurés (`api_key` chiffrée `enc:…`, `api_key_env` en repli) |
| `eval_jobs` | Jobs durables (`status`, `worker_id`, `result_summary`) |
| `rate_limit_hits` | Compteurs du rate limiter PostgreSQL |
| `question_proposals` · `proposal_votes` | Hub participatif (`voter_hash` SHA-256, unicité `(proposal_id, voter_hash)`) |

Base créée autrefois par `create_all` (avant Alembic) :

```bash
cd backend && alembic stamp 001_baseline && alembic upgrade head
```

Nouvelle migration : `cd backend && alembic revision -m "<objet>"`, `upgrade()` idempotent, `downgrade()` écrit, `models.py` et `repository.py` alignés. Elle s'exécutera au prochain démarrage.

## Jobs d'évaluation

`POST /evaluate` crée un job (`queued`), répond **202**, puis un **thread démon** l'exécute : acquisition d'un verrou (PostgreSQL `pg_try_advisory_lock`, ou `threading.Lock` sans base), `running`, import dynamique de `scripts/afribench.py`, évaluation, écriture du fichier `data/results/<modèle>_<horodatage>.json`, insertion en base, invalidation du cache, `completed` avec `result_summary` — ou `failed` avec un message d'erreur **passé par `redact_secrets()`** (ce champ est lisible sans authentification via `GET /jobs`).

Un seul job à la fois : un second `POST` pendant un run échoue immédiatement avec « Une évaluation est déjà en cours ». Le job meurt avec le processus web (chaque redéploiement interrompt une évaluation en cours) ; c'est une limite assumée (audit R19, fiche [D6](../docs/ARCHITECTURE.md#d6--des-jobs-par-threads-et-verrou-consultatif-pas-de-file-de-messages)).

## Sécurité

- **Clé d'API** (`X-API-Key`) comparée en temps constant sur les octets ; **jeton admin** HMAC-SHA256 signé avec TTL, secret dérivé du mot de passe (stdlib uniquement).
- **Rate limiting** en fenêtre glissante par `IP:chemin`, trois budgets (lecture, écriture, login), trois backends interchangeables, réponse `429` + `Retry-After`. La dépendance est volontairement **synchrone** : ses entrées-sorties bloquantes iraient sinon geler la boucle d'événements.
- **`X-Forwarded-For` n'est pas cru par défaut** : `TRUSTED_PROXY_HOPS=N` lit le N-ième élément depuis la droite, seule extrémité qu'un client ne contrôle pas.
- **Clés des fournisseurs** : chiffrées Fernet en base, jamais renvoyées au client, clé Gemini en en-tête (jamais en query string), masquage des secrets dans les messages d'erreur exposés (`redaction.py` : query strings, préfixes `sk-`/`AIza`/`hf_`, valeurs des variables d'environnement sensibles).
- **CORS** ouvert par défaut (`*`) : à restreindre en production.

Modèle de menace complet : [`docs/ARCHITECTURE.md § 9`](../docs/ARCHITECTURE.md#9-sécurité--modèle-de-menace-et-défenses).

## Tests

```bash
cd backend && PYTHONPATH=. pytest -q      # 98 tests
git diff --exit-code                       # la CI exige un dépôt propre après les tests
```

| Fichier | Portée |
|---|---|
| `test_api.py` | Endpoints publics, filtres, agrégations |
| `test_evaluate_auth.py` | Clé d'API (503/401), mise en file, 429 |
| `test_admin_security.py` | Login, mot de passe non ASCII, rate limit du login, `X-Forwarded-For` |
| `test_answer_extraction.py` | 25 cas de `extract_answer`, dont les faux positifs historiques |
| `test_redaction.py` | Masquage des clés en URL, préfixes, environnement |
| `test_proposals_api.py` | Hub : liste, validation, anonymat des votes |
| `test_durable_jobs.py` | Jobs en base et en mémoire, 3 backends de rate limit, verrou |
| `test_seed_version.py` | Upsert versionné, verrou administrateur |
| `test_consistency.py` | Corpus ↔ export frontend ↔ manifeste lm-eval |
| `test_phase3_api.py` · `test_phase3_readiness.py` | Validation, traductions, tâches ouvertes, scripts, documentation |
| `test_open_and_i18n.py` · `test_validation_scripts.py` | Schémas ouverts, juge en dry-run, κ de Cohen, lots |
| `test_stats_and_open_eval.py` | Bootstrap sur le seed, détection d'écart |
| `test_exports.py` · `test_lm_eval_utils.py` · `test_hf_space_utils.py` | Exports HF (vers `tmp_path`), dataset lm-eval, Space |
| `test_mock_eval.py` | Déterminisme du mode simulé |

Limites connues : pas de PostgreSQL de test (la couche SQL est simulée), CRUD d'administration non couvert, `lifespan` jamais exercé (audit R32 — **prérequis** des correctifs R1, R2, R9, R13, R17).

## Dépannage

| Symptôme | Cause probable | Action |
|---|---|---|
| `POST /evaluate` → 503 | `AFRIBENCH_API_KEY` non défini | Définir la variable (c'est le comportement voulu) |
| `/admin/*` → 503 | `AFRIBENCH_ADMIN_PASSWORD` non défini | Idem |
| `/proposals` → 503 | Pas de `AFRIBENCH_DATABASE_URL` | Le hub nécessite PostgreSQL |
| Tous les visiteurs reçoivent 429 | Service derrière un proxy avec `TRUSTED_PROXY_HOPS=0` | Passer à `1` |
| Base vide après démarrage malgré `DATABASE_URL` | Seed échoué (identifiant dupliqué, migration) — le service a basculé en mode fichiers | Lire les logs de démarrage ; `afribench.py validate` sur le corpus |
| Question modifiée dans le backoffice écrasée au redémarrage | Impossible si `locked_by_admin` est posé ; sinon `seed_version` a été incrémentée | Vérifier `manifest.json` |
| Job `failed` : « Une évaluation est déjà en cours » | Un autre job tient le verrou | Attendre la fin ; en multi-réplica, voir audit R1–R2 |
| Job `failed` : « Interrompu au redémarrage du serveur. » | Redéploiement pendant l'évaluation | Relancer le job |

---

Documents liés : [Architecture § 6](../docs/ARCHITECTURE.md#6-le-service-api-backend) · [Audit de qualité](../docs/AUDIT_QUALITE.md) · [Déploiement Railway](../docs/deploiement-railway.md) · [Index de la documentation](../docs/README.md)
