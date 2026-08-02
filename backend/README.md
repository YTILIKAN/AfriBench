# AfriBench Backend

Service API FastAPI — source de vérité pour les questions et résultats du benchmark.

## Endpoints (`/api/v1`)

| Méthode | Chemin | Description |
|---------|--------|-------------|
| GET | `/health` | Santé du service |
| GET | `/results` | Résultats d'évaluation (`model`, `category`, `limit`) |
| GET | `/questions` | Questions (`category`, `difficulty`, `limit`) |
| GET | `/models` | Modèles agrégés (`sort`, `open`) |
| GET | `/stats` | Statistiques globales |
| GET | `/leaderboard` | Classement + moyennes par catégorie |

Documentation interactive : [http://127.0.0.1:8080/docs](http://127.0.0.1:8080/docs)

## Données

- Questions : `data/questions/v1/validated/*.json`
- Résultats : `data/results/*.json` (fallback : `frontend/data/results.json`)

## Démarrage local

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

Ou via Docker Compose (depuis la racine) :

```bash
docker compose up --build
```

- API : http://localhost:8080  
- Frontend (nginx) : http://localhost:3000  

## Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `AFRIBENCH_CORS_ORIGINS` | `*` | Origines CORS (virgules) |
| `AFRIBENCH_DATA_DIR` | `../data` | Racine des données |
| `AFRIBENCH_PORT` | `8080` | Port d'écoute |
