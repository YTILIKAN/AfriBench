# AfriBench — évaluateur privé (HF / CI)

Espace prévu pour lancer des évaluations **hors** du Space public
(clés API, jobs longs). Le leaderboard public lit seulement des résultats
déjà publiés.

## Usage recommandé (monorepo)

```bash
# Évaluation Afrique
python scripts/afribench.py run --model gpt-4o

# Baseline témoins
python scripts/afribench.py run --questions witness --model gpt-4o

# Ou via API backend
curl -X POST http://127.0.0.1:8080/api/v1/evaluate \
  -H "X-API-Key: $AFRIBENCH_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o"}'
```

## Conteneur

```bash
docker compose --profile eval run --rm eval run --model gpt-4o
```

Le fichier `app.py` de ce dossier est un **stub** documentaire pour un futur
Space privé HF ; il n'exécute pas d'appels API par défaut.
