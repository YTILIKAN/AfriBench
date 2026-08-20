# Frontend AfriBench

UI statique (vanilla JS) qui consomme l'API backend.

## Modes de chargement

1. **API** (prioritaire) — `GET /api/v1/results` + `/questions`
2. **Fallback statique** — `frontend/data/*.json` si l'API est injoignable

Base API configurable via :
- `window.AFRIBENCH_API_BASE = 'http://…/api/v1'`
- `<meta name="afribench-api" content="/api/v1">`
- Port `8000` → `http://127.0.0.1:8080/api/v1` automatiquement

## Démarrage

```bash
# Avec Docker (proxy nginx /api → backend)
docker compose up --build
# → http://localhost:3000

# Ou serveur statique + backend séparé
cd backend && uvicorn app.main:app --port 8080
cd frontend && python3 -m http.server 8000
```

## Structure

```
frontend/
├── index.html
├── nginx.conf           # Proxy /api (image Docker)
├── Dockerfile
├── css/style.css
├── js/                  # app.js charge l'API ; vues leaderboard, models, …
└── data/                # Fallback JSON (export_frontend.py)
```

## Déploiement

- **Stack complète** : `docker compose` (frontend + backend)
- **Pages statiques seules** (GitHub Pages) : fallback JSON, sans API live
