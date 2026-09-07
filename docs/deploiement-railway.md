# Déploiement en production (Railway)

AfriBench se déploie en **deux services Railway** depuis le même dépôt : une API privée et un site public qui la joint par le réseau interne. La copie statique sur GitHub Pages et le Space Hugging Face sont publiés par la CI et ne dépendent pas de Railway ([Architecture § 11](ARCHITECTURE.md#11-déploiement-et-exploitation)).

> **En clair.** Deux conteneurs sortis du même dépôt : le guichet (API) n'a pas de porte sur la rue, seule la vitrine (site) en a une, et elle passe les commandes au guichet par le couloir intérieur. Si le guichet ferme, la vitrine reste ouverte et montre la dernière édition imprimée.

**Version du document :** 7 septembre 2026.

---

## Sommaire

- [Vue d'ensemble](#vue-densemble)
- [Configuration de chaque service](#configuration-de-chaque-service)
- [Variables d'environnement](#variables-denvironnement)
- [Healthchecks](#healthchecks)
- [Domaine public](#domaine-public)
- [Mise à jour et cycle de vie](#mise-à-jour-et-cycle-de-vie)
- [Dépannage](#dépannage)
- [Vérification après déploiement](#vérification-après-déploiement)
- [Local (Docker Compose)](#local-docker-compose)

---

## Vue d'ensemble

| Service | Rôle | Dockerfile | Fichier de configuration | Port | Domaine public |
|---|---|---|---|---|---|
| `afribench-api` | API FastAPI (+ PostgreSQL du plugin Railway) | `backend/Dockerfile` | `railway.backend.toml` | `$PORT` (injecté) | optionnel |
| `afribench-frontend` | Site (nginx) + proxy `/api` → API | `frontend/Dockerfile` | `railway.frontend.toml` | `$PORT` (injecté) | **requis** |

Les deux Dockerfiles copient depuis la **racine** du dépôt (`backend/`, `data/`, `configs/`, `scripts/`, `frontend/`) : c'est une conséquence du monorepo ([D3](ARCHITECTURE.md#d3--un-dépôt-unique-monorepo)).

## Configuration de chaque service

Pour **chaque** service, dans le tableau de bord Railway :

1. **Settings → Source → Root Directory** : laisser **vide**.
2. **Settings → Build → Config as Code (Custom config path)** :
   - service API → `railway.backend.toml`
   - service site → `railway.frontend.toml`

   Sans ce réglage, Railway applique `railway.toml` (racine) aux deux services : les deux construisent le frontend et le healthcheck `/api/v1/health` de l'API échoue. C'était la cause historique des échecs de déploiement (PR #35–#36).

3. **Plugin PostgreSQL** (optionnel mais recommandé) : l'ajouter au projet, puis référencer son URL dans `AFRIBENCH_DATABASE_URL` du service API. Sans base, l'API fonctionne en mode fichiers (lecture complète ; hub participatif et backoffice indisponibles).

## Variables d'environnement

### API (`afribench-api`)

Toutes les variables du service sont documentées dans [`backend/README.md § Configuration`](../backend/README.md#configuration). Celles qui comptent pour un déploiement :

| Variable | Requis | Valeur conseillée | Pourquoi |
|---|---|---|---|
| `PORT` | auto | — | Injecté par Railway ; le Dockerfile écoute dessus |
| **`AFRIBENCH_TRUSTED_PROXY_HOPS`** | **oui** | `1` | Le service est derrière le proxy Railway (voir encadré) |
| `AFRIBENCH_CORS_ORIGINS` | recommandé | `https://<site>.up.railway.app,https://ytilikan.github.io` | Défaut `*` ; à restreindre dès qu'un secret est défini |
| `AFRIBENCH_DATABASE_URL` | recommandé | `${{Postgres.DATABASE_URL}}` | Active migrations, seed, jobs durables, hub, backoffice ; `postgresql://` est réécrit en `postgresql+psycopg://` |
| `AFRIBENCH_API_KEY` | si `POST /evaluate` est utilisé | valeur longue et aléatoire | Sans elle, `/evaluate` et `/reload` répondent 503 (voulu) |
| `AFRIBENCH_ADMIN_PASSWORD` | si backoffice | valeur longue et aléatoire | Sans elle, `/admin/*` répond 503 (voulu) ; la changer invalide toutes les sessions |
| `AFRIBENCH_ENCRYPTION_KEY` | si clés saisies dans le backoffice | clé Fernet (`python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`) | Chiffre les clés d'API stockées en base ; **sans elle, elles sont stockées en clair** (audit R5) |
| `AFRIBENCH_REDIS_URL` | non | `${{Redis.REDIS_URL}}` | Rate limiting distribué ; sinon PostgreSQL, sinon mémoire (`AFRIBENCH_RATE_LIMIT_BACKEND=auto`) |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, … | si évaluation | — | Clés des fournisseurs, ou saisie dans le backoffice |

> **`AFRIBENCH_TRUSTED_PROXY_HOPS=1` est obligatoire sur Railway.** Le rate limiting identifie l'appelant par son IP. À `0` (défaut), l'en-tête `X-Forwarded-For` est ignoré — comportement voulu en exposition directe, car cet en-tête est fourni par le client et le faire tourner contournerait toute limite ([D12](ARCHITECTURE.md#d12--ne-pas-croire-x-forwarded-for-sans-déclaration)). Mais derrière un proxy, toutes les requêtes portent l'IP du proxy : **tous les visiteurs partagent alors un même compteur de 120 requêtes par minute et se bloquent mutuellement**. Avec `1`, l'API lit l'entrée écrite par le proxy Railway, la seule qu'un client ne contrôle pas.

### Site (`afribench-frontend`)

| Variable | Requis | Défaut | Notes |
|---|---|---|---|
| `PORT` | auto | `8080` | nginx écoute dessus (`envsubst` sur le template, limité à `PORT` et `BACKEND_URL`) |
| `BACKEND_URL` | non | `http://afribench-api.railway.internal:8080` | URL **interne** de l'API. Si le service API porte un autre nom : `http://<nom>.railway.internal:8080` |

**Tolérance aux pannes.** nginx résout `BACKEND_URL` **à la requête** (resolver généré au démarrage depuis `/etc/resolv.conf`, adresses IPv6 encadrées ; `proxy_pass` via une variable). Si l'API est arrêtée ou mal nommée, le site démarre quand même et sert ses données statiques ; seul `/api/*` répond 502. Le workflow `docker-services.yml` le vérifie à chaque changement des Dockerfiles ([Architecture § 7.10](ARCHITECTURE.md#710-nginx--un-détail-qui-a-supprimé-une-classe-de-pannes)).

## Healthchecks

Les deux images embarquent un **`HEALTHCHECK` Docker**, interne au conteneur et visible dans le tableau de bord :

- API : `GET 127.0.0.1:$PORT/api/v1/health` (avec `start-period` pour laisser le temps aux migrations Alembic)
- Site : `GET 127.0.0.1:$PORT/`

**Pourquoi aucun `healthcheckPath` dans les `railway.*.toml` ?** Le healthcheck de `railway up` vérifie le service via son **URL publique**. Sans domaine généré, il boucle sur « service unavailable » puis échoue (« Deploy failed ») **même si le conteneur fonctionne**. Les healthchecks sont donc internes, et seul le site a besoin d'un domaine public.

Limite connue : `/health` répond `ok` sans tester la base ni les migrations ; un conteneur en mode dégradé est déclaré sain (audit R6).

## Domaine public

- **Site** : requis — *Settings → Networking → Generate Domain* (port 8080). C'est l'URL publique.
- **API** : optionnel. Le site la joint par le réseau privé. Générer un domaine uniquement si l'API doit être appelée directement (par exemple depuis GitHub Pages) — et dans ce cas, restreindre `AFRIBENCH_CORS_ORIGINS`.

## Mise à jour et cycle de vie

- Le déploiement se fait depuis le tableau de bord Railway ou la CLI (`railway up --service <nom>`), avec un *project token*. Aucun workflow GitHub Actions ne déploie sur Railway ; les 7 workflows du dépôt couvrent la CI, GitHub Pages, les images Docker et le Space.
- **Au démarrage avec base**, l'API exécute `alembic upgrade head`, puis l'amorçage conditionnel du corpus (`seed_version`, `locked_by_admin`), puis la reprise des jobs (`running` orphelins → `failed` « Interrompu au redémarrage du serveur. », `queued` relancés). Un redéploiement pendant une évaluation l'interrompt : c'est une limite assumée ([D6](ARCHITECTURE.md#d6--des-jobs-par-threads-et-verrou-consultatif-pas-de-file-de-messages), audit R19).
- **Base héritée de `create_all`** (avant Alembic) : `alembic stamp 001_baseline && alembic upgrade head` une seule fois, depuis `backend/`.
- **Correction du corpus par PR** : après fusion, redéployer l'API ; les questions non verrouillées et dont `seed_version` a augmenté sont resynchronisées. Une correction faite dans le backoffice (`locked_by_admin`) n'est jamais écrasée.

## Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `Deploy failed` après N× « service unavailable » | Healthcheck via URL publique sans domaine | Ne pas déclarer `healthcheckPath` ; s'appuyer sur le `HEALTHCHECK` Docker |
| Service « unhealthy » | Le conteneur ne répond pas sur `$PORT` | *Deployments → View Logs* |
| Build échoue sur `COPY data /app/data` | Root Directory ≠ racine | Laisser Root Directory vide |
| Les deux services construisent le frontend | Config file path non renseigné | `railway.backend.toml` / `railway.frontend.toml` par service |
| Site en ligne mais `/api/*` en 502 | `BACKEND_URL` ≠ nom du service API | `BACKEND_URL=http://<nom>.railway.internal:8080` |
| Tous les visiteurs reçoivent 429 | `AFRIBENCH_TRUSTED_PROXY_HOPS=0` | Passer à `1` |
| Site sans style ni interactivité, classement statique seulement | Assets Vite en chemin absolu (régression corrigée, garde-fou en CI) | Vérifier `base: './'` dans `vite.config.js` |
| Hub participatif → 503 | Pas de `AFRIBENCH_DATABASE_URL` | Ajouter le plugin PostgreSQL |
| Backoffice → 503 | Pas de `AFRIBENCH_ADMIN_PASSWORD` | Définir la variable |
| Base vide malgré `DATABASE_URL` | Seed échoué (identifiant dupliqué, migration) ; l'API a basculé en mode fichiers sans erreur visible | Logs de démarrage ; `afribench.py validate` |
| `railway up` : unauthorized | Le jeton n'est pas un *project token* | Project → Settings → Tokens |

**Vérifier que l'API tourne vraiment** : *Deployments → View Logs* du service API → chercher `Uvicorn running on http://0.0.0.0:8080`. S'il est là, le service est sain même sans domaine public.

## Vérification après déploiement

```bash
curl -s https://<site>.up.railway.app/ | head -5                       # HTML du site
curl -s https://<site>.up.railway.app/api/v1/health                    # {"status":"ok"} via le proxy
curl -sI https://<site>.up.railway.app/ | grep -i content-security     # CSP servie par nginx
curl -s https://<site>.up.railway.app/api/v1/stats | jq .total_questions
# Rate limiting : 130 requêtes rapides depuis un même poste doivent finir en 429 (et pas seulement les vôtres si HOPS=0)
```

## Local (Docker Compose)

```bash
docker compose up --build
# Site : http://localhost:3000 (nginx sur 8080 en interne) · API : http://localhost:8080 · PostgreSQL : 5432
docker compose --profile eval run --rm eval run --model gpt-4o   # évaluation reproductible
```

`docker-compose.yml` reproduit la topologie de production : `postgres:16-alpine` (healthcheck `pg_isready`), l'API attend la base saine, le site attend l'API saine. Les volumes montent `data/` en écriture (résultats de `POST /evaluate`), `configs/` et `scripts/` en lecture seule.

---

Documents liés : [Architecture § 11](ARCHITECTURE.md#11-déploiement-et-exploitation) · [backend/README § Configuration](../backend/README.md#configuration) · [frontend/README § Production](../frontend/README.md#production--nginx-et-déploiement) · [Index de la documentation](README.md)
