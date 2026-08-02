# AfriBench Backend

Service API FastAPI — lecture publique + évaluation authentifiée.

## Endpoints (`/api/v1`)

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| GET | `/health` | — | Santé du service |
| GET | `/results` | — | Résultats (`model`, `category`, `limit`) |
| GET | `/questions` | — | Questions (`category`, `difficulty`, `limit`) |
| GET | `/models` | — | Scores agrégés (`sort`, `open`) |
| GET | `/models/configured` | — | Modèles de `configs/models.yaml` |
| GET | `/stats` | — | Statistiques globales |
| GET | `/leaderboard` | — | Classement + moyennes |
| POST | `/evaluate` | `X-API-Key` | Lance une évaluation (async) |
| GET | `/jobs` · `/jobs/{id}` | — | Suivi des jobs |
| POST | `/reload` | `X-API-Key` | Recharge le cache disque |

Docs : [http://127.0.0.1:8080/docs](http://127.0.0.1:8080/docs)

## Évaluation via API

```bash
export AFRIBENCH_API_KEY=change-me-in-production
export OPENAI_API_KEY=sk-...

curl -X POST http://127.0.0.1:8080/api/v1/evaluate \
  -H "X-API-Key: $AFRIBENCH_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o","limit":5}'

curl -s http://127.0.0.1:8080/api/v1/jobs/<job_id> | jq .
```

Sans `AFRIBENCH_API_KEY`, les endpoints d'écriture répondent **503**.

## Rate limiting

Fenêtre glissante par IP+path (in-memory, process unique) :

| Type | Défaut |
|------|--------|
| Lecture | 120 req / 60 s |
| Écriture | 10 req / 60 s |

Variables : `AFRIBENCH_RATE_LIMIT_READ`, `_READ_WINDOW`, `_WRITE`, `_WRITE_WINDOW`.

## Données

- Questions : `data/questions/v1/validated/*.json`
- Résultats : `data/results/*.json` (fallback : `frontend/data/results.json`)
- Évaluation : réutilise `scripts/afribench.py`

## Démarrage

```bash
cd backend
pip install -r requirements.txt
# depuis la racine du repo, avec .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

```bash
docker compose up --build
```

## Tests

```bash
cd backend && PYTHONPATH=. pytest -q
```
