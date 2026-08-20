# Déploiement Railway

AfriBench se déploie en **deux services Railway** depuis le même dépôt.

## Vue d'ensemble

| Service | Rôle | Dockerfile | Config | Port |
|---|---|---|---|---|
| `afribench-api` | API FastAPI | `backend/Dockerfile` | `railway.backend.toml` | `$PORT` (géré) |
| `afribench-frontend` | UI statique (nginx) | `frontend/Dockerfile` | `railway.frontend.toml` | `$PORT` (géré) |

## Configuration de chaque service (dashboard Railway)

Pour **chaque** service, dans *Settings → Source* et *Settings → Build* :

1. **Root Directory** : laisser **vide** (racine du dépôt) — les Dockerfiles copient
   `backend/`, `data/`, `configs/`, `scripts/` depuis la racine.
2. **Config file path** (*Settings → Build → Config as Code / Custom config path*) :
   - service backend → `railway.backend.toml`
   - service frontend → `railway.frontend.toml`

   ⚠️ Sans ce réglage, Railway utilise `railway.toml` (racine) pour les deux services
   → les deux builderaient le frontend, et le healthcheck `/api/v1/health` du backend
   échouerait. C'était la cause historique des échecs de déploiement.

## Variables d'environnement

### Backend (`afribench-api`)

| Variable | Requis | Défaut | Notes |
|---|---|---|---|
| `PORT` | auto (Railway) | `8080` | injecté par Railway, déjà géré par le Dockerfile |
| `AFRIBENCH_DATABASE_URL` | non | _(vide)_ | URL Postgres du plugin Railway → active la persistance |
| `AFRIBENCH_API_KEY` | non | _(vide)_ | active `POST /evaluate` et `/reload` |
| `AFRIBENCH_ADMIN_PASSWORD` | non | _(vide)_ | active le backoffice `/admin/` |
| `AFRIBENCH_CORS_ORIGINS` | non | `*` | restreindre au domaine du frontend en prod |
| `AFRIBENCH_REDIS_URL` | non | _(vide)_ | rate-limit distribué |

Sans `AFRIBENCH_DATABASE_URL`, l'API lit les JSON du dépôt (mode dégradé fonctionnel).

### Frontend (`afribench-frontend`)

| Variable | Requis | Défaut | Notes |
|---|---|---|---|
| `PORT` | auto (Railway) | `8080` | nginx écoute dessus (template envsubst) |
| `BACKEND_URL` | non | `http://afribench-api.railway.internal:8080` | URL **interne** du service backend |

⚠️ `BACKEND_URL` suppose que le service backend s'appelle `afribench-api` dans le
projet Railway. S'il porte un autre nom, ajuster `BACKEND_URL` en conséquence
(`http://<nom-du-service>.railway.internal:8080`).

**Tolérance aux pannes** : le proxy nginx résout le backend *à la requête* (resolver
généré au démarrage depuis `/etc/resolv.conf`). Si le backend est down ou mal nommé,
le frontend démarre quand même et sert les données statiques de repli — seul
`/api/*` répond 502.

## Healthchecks

- Backend : `GET /api/v1/health` (voir `railway.backend.toml`)
- Frontend : `GET /` (voir `railway.frontend.toml`)

## Vérification après déploiement

```bash
curl -s https://<frontend>.up.railway.app/ | head -5          # HTML de l'app
curl -s https://<frontend>.up.railway.app/api/v1/health       # {"status":"ok"} via proxy
curl -s https://<backend>.up.railway.app/api/v1/health        # direct
```

## Local (docker compose)

```bash
docker compose up --build
# frontend → http://localhost:3000 (nginx sur 8080 en interne)
# backend  → http://localhost:8080
```
