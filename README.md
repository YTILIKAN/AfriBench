# AfriBench

> Évaluer les modèles de langage sur les réalités africaines.
> Benchmark public, ouvert, reproductible et contextuellement ancré.

**Statut : Prototype v0.1** 🚧  
**Version :** Juin 2026 · **Questions :** 101 · **Langues :** Français uniquement (multilingue planifié)

> ⚠️ **AfriBench est en phase de prototypage.** Le classement actuel est indicatif — l'échantillon de 101 questions est trop petit pour tirer des conclusions statistiquement significatives. Consultez [CRITIQUE.md](CRITIQUE.md) pour l'analyse détaillée des limites et la roadmap.

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

## Structure du repo

```
AfriBench/
├── data/
│   └── questions/          # Jeux de questions (template + v1)
│       ├── template.json    # Schéma de référence
│       └── v1/
│           ├── raw/          # Questions brutes
│           └── validated/    # Questions validées (9 fichiers JSON)
├── scripts/                # Scripts d'évaluation
│   ├── afribench.py         # CLI d'évaluation principale
│   ├── export_frontend.py   # Export des données pour le frontend
│   └── lm_eval_tasks/       # Intégration LM Evaluation Harness (à venir)
├── configs/                # Configuration
│   ├── models.yaml          # Modèles à évaluer
│   └── categories.yaml      # Catégories du benchmark
├── frontend/               # Application web statique
│   ├── index.html
│   ├── css/style.css
│   ├── js/                  # app.js, leaderboard.js, categories.js, etc.
│   └── data/                # Généré par export_frontend.py
├── research/               # Documents de cadrage
│   ├── 01-finalite.md
│   ├── 02-objectifs.md
│   ├── 03-phases.md
│   ├── 04-frameworks.md
│   ├── 05-stack.md
│   ├── 06-livrables.md
│   └── 07-equipe.md
├── CRITIQUE.md             # Analyse détaillée des forces/faiblesses
└── README.md
```

---

## Démarrage rapide

### Évaluer un modèle

```bash
# Installer les dépendances
pip install pyyaml requests

# Configurer les clés API (variables d'environnement)
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
# etc.

# Lancer l'évaluation
python scripts/afribench.py run

# Évaluer un modèle spécifique
python scripts/afribench.py run --model gpt-4o

# Afficher le leaderboard
python scripts/afribench.py leaderboard

# Exporter les résultats
python scripts/afribench.py export --format csv
```

### Lancer le frontend localement

```bash
# Générer les données pour le frontend
python scripts/export_frontend.py

# Servir le frontend
cd frontend && python -m http.server 8000
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
