# AfriBench

> Évaluer les modèles de langage sur les réalités africaines.
> Benchmark public, ouvert, reproductible et contextuellement ancré.

**Statut : Prototype v0.1** 🚧  
**Version :** Août 2026 · **Questions :** 125 Afrique + 20 témoins · **Langues :** Français (multilingue planifié)

> ⚠️ **AfriBench est en phase de prototypage.** Le classement actuel est indicatif — 125 questions restent insuffisantes pour des conclusions statistiquement fortes. Consultez [CRITIQUE.md](CRITIQUE.md) et [data/DATASET_CARD.md](data/DATASET_CARD.md).

---

## Pourquoi ce benchmark ?

Les benchmarks LLM existants (MMLU, HellaSwag, HumanEval) sont massivement anglo-centrés et occidentalo-centrés. L'Afrique y est sous-représentée, tant dans les langues que dans les thématiques.

AfriBench est un projet communautaire porté par [Y'TILIKAN](https://ytilikan.com) pour :

- Mesurer la performance des LLMs sur des **connaissances africaines** (histoire, géographie, droit, économie, santé, culture)
- Créer un **corpus ouvert et contributif** de questions validées
- Fournir un **tableau de bord public** pour suivre l'évolution des modèles

## Limites actuelles (honnêteté)

| Limite | Détail | Plan |
|--------|--------|------|
| **101 questions** | ~11/catégorie — statistiquement insuffisant pour classer des modèles | Cible : 300+ (Phase 2) |
| **Français uniquement** | Aucune langue africaine évaluée | Cible : swahili, yoruba, amharique (Phase 3) |
| **Validation externe absente** | Toutes les questions écrites par une seule personne | Recrutement de validateurs en cours |
| **Format QCM exclusif** | Pas de génération, traduction, raisonnement ouvert | Tâches ouvertes planifiées (Phase 3) |

> 📋 **Document complet des forces, faiblesses et solutions :** [CRITIQUE.md](CRITIQUE.md)

---

## Architecture

```
AfriBench/
├── backend/                # Service API FastAPI (:8080)
│   ├── app/                # routers, services, config
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/               # UI statique (nginx :3000 ou http.server :8000)
│   ├── index.html
│   ├── css/ · js/
│   ├── data/               # Fallback JSON (GitHub Pages / offline)
│   ├── nginx.conf          # Proxy /api → backend
│   └── Dockerfile
├── data/                   # Source de vérité (questions + résultats)
├── scripts/                # CLI d'évaluation (afribench.py)
├── configs/                # models.yaml, categories.yaml
├── docker-compose.yml      # backend + frontend
└── research/ · CRITIQUE.md · ROADMAP.md
```

Le frontend consomme `GET /api/v1/results` et `GET /api/v1/questions`.  
S'il n'y a pas de backend, il retombe sur `frontend/data/*.json`.

---

## Démarrage rapide

### Option A — Docker (recommandé)

```bash
docker compose up --build
# Frontend : http://localhost:3000
# API      : http://localhost:8080/api/v1
# Docs     : http://localhost:8080/docs

# Image d'évaluation seule
docker build -t afribench:eval .
docker run --rm --env-file .env afribench:eval run --model gpt-4o
# ou
docker compose --profile eval run --rm eval run --model gpt-4o
```

### LM Evaluation Harness

```bash
pip install lm-eval
python scripts/export_lm_eval_dataset.py   # régénère data/lm_eval/
lm_eval --model openai-chat-completions \
  --model_args model=gpt-4o \
  --tasks afribench \
  --include_path scripts/lm_eval_tasks/ \
  --num_fewshot 0
```

### Dataset Hugging Face (local → Hub)

```bash
python scripts/export_hf_dataset.py
# Fichiers : data/hf/YTILIKAN__AfriBench/{african,control}.jsonl + README
# Publication (optionnel) :
#   pip install datasets huggingface_hub && huggingface-cli login
#   python scripts/export_hf_dataset.py --push
```

### Questions témoins (baseline)

```bash
python scripts/afribench.py run --questions witness --model gpt-4o
```

125 questions Afrique + 20 témoins (`is_control`).

### Régénérer le frontend (SEO)

```bash
python scripts/export_frontend.py
python scripts/generate_static_html.py   # classement dans le HTML + bootstrap.json
```

### Option B — Services séparés

```bash
# Terminal 1 — backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080

# Terminal 2 — frontend
cd frontend && python3 -m http.server 8000
# → http://localhost:8000  (appelle l'API sur :8080)
```

### Évaluer un modèle

```bash
# CLI
pip install pyyaml requests
export OPENAI_API_KEY="sk-..."
python3 scripts/afribench.py run --model gpt-4o

# Ou via l'API (backend démarré, AFRIBENCH_API_KEY défini)
curl -X POST http://127.0.0.1:8080/api/v1/evaluate \
  -H "X-API-Key: $AFRIBENCH_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o","limit":5}'
curl -s http://127.0.0.1:8080/api/v1/jobs/<job_id>
```

---

## Contribuer

AfriBench est un projet communautaire. Vous pouvez :

- **Ajouter des questions** — voir [CONTRIBUTING.md](CONTRIBUTING.md)
- **Valider des questions existantes** — signalez les erreurs dans les [issues](https://github.com/YTILIKAN/AfriBench/issues)
- **Proposer des modèles** — ajoutez-les dans `configs/models.yaml`
- **Améliorer le site** — PR bienvenues sur le frontend

### Format d'une question

```json
{
  "id": "HIST-001",
  "category": "histoire",
  "subcategory": "empires_precoloniaux",
  "difficulty": "medium",
  "language": "fr",
  "question": "Quel empire ouest-africain était réputé pour sa richesse en or et sa ville universitaire de Tombouctou au XIVe siècle ?",
  "options": {
    "A": "Empire du Ghana",
    "B": "Empire du Mali",
    "C": "Empire Songhaï",
    "D": "Royaume du Bénin"
  },
  "answer": "B",
  "explanation": "L'Empire du Mali, sous le règne de Mansa Moussa...",
  "source": "UNESCO Histoire Générale de l'Afrique, Vol. IV",
  "author": "",
  "date_created": "2026-06-04",
  "date_validated": null,
  "validated_by": null
}
```

---

## Catégories

| Catégorie | Code | Questions |
|-----------|------|-----------|
| Histoire | HIST | Précoloniale, coloniale, post-coloniale |
| Géographie | GEOG | Physique, politique, urbaine |
| Droit et Politique | POL | Systèmes juridiques, gouvernance |
| Santé et Sciences | SANTE | Santé publique, épidémiologie |
| Langue et Culture | LANG | Langues africaines, littérature |
| Économie | ECON | Développement, numérique |
| IA et Technologie | IA | IA et tech en Afrique |
| Société | SOC | Démographie, éducation, médias |
| Raisonnement Culturel | CULT | Logique et sagesse contextuelle |

---

## Roadmap

Voir [CRITIQUE.md](CRITIQUE.md#3-solutions-et-roadmap) pour le plan détaillé.

- **Phase 1** (juillet 2026) : Corrections critiques (a11y, sécurité XSS, mobile, honnêteté)
- **Phase 2** (août-sept 2026) : 300+ questions, validateurs africains, questions témoins
- **Phase 3** (oct-déc 2026) : Multilingue, tâches ouvertes, LM Eval Harness, soumission académique

---

**Y'TILIKAN** · Démocratiser l'IA · [ytilikan.com](https://ytilikan.com)
