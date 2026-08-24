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
| `AFRIBENCH_TRUSTED_PROXY_HOPS` | **oui sur Railway** | `0` | mettre `1` : le service est derrière le proxy Railway |

> ⚠️ **`AFRIBENCH_TRUSTED_PROXY_HOPS=1` est nécessaire sur Railway.** Le rate
> limiting identifie l'appelant par son IP. Laissé à `0`, l'en-tête
> `X-Forwarded-For` est ignoré — comportement voulu en exposition directe, car
> cet en-tête est fourni par le client et le faire tourner contournerait toute
> limite. Mais derrière un proxy, toutes les requêtes portent l'IP du proxy :
> tous les visiteurs partagent alors un même compteur et se bloquent
> mutuellement. Avec `1`, l'API lit l'entrée écrite par le proxy Railway.

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

Les deux images embarquent un **`HEALTHCHECK` Docker** (vérification interne au
conteneur, visible dans le dashboard Railway) :

- Backend : `GET 127.0.0.1:$PORT/api/v1/health`
- Frontend : `GET 127.0.0.1:$PORT/`

⚠️ **Pourquoi pas de `healthcheckPath` dans les railway.toml ?** Le healthcheck
de `railway up` (workflow `deploy.yml`) vérifie le service via son **URL
publique**. Sans domaine généré, il boucle sur « service unavailable » puis
échoue (« Deploy failed ») **même si le conteneur fonctionne**. Les
healthchecks sont donc internes (Docker), et seul le frontend a besoin d'un
domaine public.

## Domaine public

- **`afribench-web` (frontend)** : requis — *Settings → Networking → Generate
  Domain* (port 8080). C'est l'URL publique du site.
- **`afribench-api` (backend)** : optionnel. Le frontend le joint via le réseau
  privé (`afribench-api.railway.internal:8080`). Générer un domaine dessus
  uniquement si l'API doit être appelée publiquement en direct.

## Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `Deploy failed` après N× « service unavailable » | Ancien healthcheck CLI via URL publique | Corrigé : healthchecks internes Docker (cette version) |
| Service « unhealthy » dans le dashboard | Le conteneur ne répond pas sur `$PORT` | Voir les logs du service (onglet *Deployments → View Logs*) |
| Build échoue sur `COPY data /app/data` | Root Directory du service ≠ racine | Laisser Root Directory vide |
| Les deux services buildent le frontend | Config file path non renseigné | `railway.backend.toml` / `railway.frontend.toml` par service |
| Frontend up mais `/api/*` en 502 | `BACKEND_URL` ne correspond pas au nom du service backend | `BACKEND_URL=http://<nom-service>.railway.internal:8080` |
| `railway up` : unauthorized | `RAILWAY_TOKEN` n'est pas un *project token* | Créer un Project Token (Project → Settings → Tokens) et maj le secret GitHub |

**Vérifier que le backend tourne vraiment** : dashboard Railway → service
`afribench-api` → *Deployments → View Logs* → chercher `Uvicorn running on
http://0.0.0.0:8080`. S'il est là, le service est sain même sans domaine public.

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
