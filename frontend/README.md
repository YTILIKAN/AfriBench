# Frontend AfriBench

UI vanilla JS (SPA par onglets) bundlée avec **Vite**, qui consomme l'API backend
avec repli automatique sur des JSON statiques.

## Démarrage

```bash
# Dev avec hot-reload (proxy /api → backend :8080)
npm install
npm run dev
# → http://localhost:3000

# Build de production (dist/ + données statiques)
npm run build

# Stack complète (proxy nginx /api → backend)
docker compose up --build
# → http://localhost:3000
```

## Modes de chargement des données

1. **Bootstrap** — `data/bootstrap.json` (pré-généré, premier paint / SEO)
2. **API** (prioritaire si joignable) — `GET /api/v1/results` + `/questions` + `/stats`
3. **Fallback statique** — `frontend/data/*.json` si l'API est injoignable

La source active est affichée dans le pied de la sidebar (badge « Données : … »).

Base API configurable via :
- `window.AFRIBENCH_API_BASE = 'http://…/api/v1'`
- `<meta name="afribench-api" content="/api/v1">`
- Port `8000` → `http://127.0.0.1:8080/api/v1` automatiquement

## Qualité

```bash
npm run lint    # ESLint (no-undef, no-unused-vars, …)
npm test        # Vitest + jsdom (smoke tests des vues)
```

## Structure

```
frontend/
├── index.html           # Shell SPA + SEO/JSON-LD + classement statique (no-JS)
├── src/main.js          # Entrée Vite (Chart.js, fonts Sora, CSS, modules)
├── js/                  # app.js (core) + une vue par onglet
├── css/style.css        # Design tokens Y'TILIKAN, thèmes clair/sombre
├── data/                # Fallback JSON (export_frontend.py)
├── admin/               # Backoffice (servi tel quel)
├── nginx.template.conf  # Proxy /api (image Docker, PORT + BACKEND_URL)
└── vite.config.js
```

## Déploiement

- **Stack complète** : `docker compose` (frontend + backend)
- **Pages statiques seules** (GitHub Pages) : `npm run build`, fallback JSON, sans API live
