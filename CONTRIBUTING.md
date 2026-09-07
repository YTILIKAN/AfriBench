# Contribuer à AfriBench

Merci de votre intérêt. AfriBench est un benchmark communautaire pour évaluer les modèles de langage sur les réalités africaines. Tout ce qui suit s'exécute depuis la racine du dépôt.

> Avant de modifier le code, lisez [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) : il explique comment le système est construit et **pourquoi** — et son § 14 est un guide pas à pas pour ajouter un modèle, une catégorie, une langue, un endpoint, une vue ou une migration.

## Les voies de contribution

| Voie | Impact | Documentation |
|---|---|---|
| **Valider des questions** | **Le manque n° 1 du projet** (couverture actuelle : 0 %) | [`docs/VALIDATORS.md`](docs/VALIDATORS.md) · [`docs/VALIDATION_PROTOCOL.md`](docs/VALIDATION_PROTOCOL.md) · [`docs/ANNOTATOR_CONSENT.md`](docs/ANNOTATOR_CONSENT.md) |
| Proposer des questions QCM | Corpus | Format ci-dessous + pull request ; ou la vue *Participer* du site (vote communautaire) ; ou le formulaire d'issue |
| Traduire (sw, yo, am) | Multilingue | [`data/questions/v1/translations/README.md`](data/questions/v1/translations/README.md) |
| Tâches non-QCM | Au-delà du QCM | [`data/questions/v1/open/README.md`](data/questions/v1/open/README.md) |
| Ajouter un modèle ou un fournisseur | Couverture des modèles | [`configs/README.md`](configs/README.md) |
| Corriger un défaut connu | Robustesse | [`docs/AUDIT_QUALITE.md § 5`](docs/AUDIT_QUALITE.md#5-ordre-de-traitement-recommandé) — liste priorisée, identifiants R*n* |
| Frontend / API | Produit | [`frontend/README.md`](frontend/README.md) · [`backend/README.md`](backend/README.md) |

## Format d'une question QCM

Gabarit de référence : [`data/questions/template.json`](data/questions/template.json). Contrat détaillé : [`data/README.md`](data/README.md#le-contrat-dune-question).

```json
{
  "id": "HIST-0xx",
  "category": "histoire",
  "subcategory": "…",
  "difficulty": "easy|medium|hard",
  "language": "fr",
  "question": "…",
  "options": {"A": "…", "B": "…", "C": "…", "D": "…"},
  "answer": "B",
  "explanation": "…",
  "source": "…",
  "author": "votre-id",
  "date_created": "YYYY-MM-DD",
  "date_validated": null,
  "validated_by": null
}
```

Règles :

- **`id` unique** sur tout le corpus, au préfixe de la catégorie (`HIST`, `GEOG`, `POL`, `SANTE`, `LANG`, `ECON`, `IA`, `SOC`, `CULT`). La CI refuse un doublon.
- **`source` et `explanation` obligatoires** : un corrigé doit pouvoir être contesté. Privilégier des références vérifiables (UNESCO, travaux d'universitaires africains, textes juridiques régionaux).
- Laisser `date_validated` et `validated_by` à `null` : ils sont remplis par le pipeline de validation externe, pas par l'auteur.
- Une seule bonne réponse, quatre options distinctes et plausibles, pas de « toutes les réponses ci-dessus ».

Ajouter l'item au fichier de sa catégorie dans `data/questions/v1/validated/`, puis :

```bash
python scripts/afribench.py validate                  # schéma, réponses, catégories, identifiants uniques
python scripts/export_frontend.py                      # copies pour le site
python scripts/export_lm_eval_dataset.py               # copies pour LM Evaluation Harness
cd backend && PYTHONPATH=. pytest -q tests/test_consistency.py   # corpus ↔ exports cohérents
```

## Validation externe

```bash
python scripts/prepare_validation_batch.py --size 40 --seed 42 --validator <votre-id> --out data/validation/batch_01.jsonl
# … revue humaine du lot (JSONL) …
python scripts/apply_validations.py --batch data/validation/batch_01_reviewed.jsonl --dry-run
python scripts/apply_validations.py --batch data/validation/batch_01_reviewed.jsonl
python scripts/validation_status.py                    # couverture mise à jour
```

Deux validateurs sur un même lot permettent de calculer l'accord inter-annotateurs : `python scripts/compute_inter_annotator.py --batch-a … --batch-b …`.

## Contribuer au code

1. Une issue (ou un identifiant R*n* de l'audit), une branche, une pull request, une revue.
2. Avant d'ouvrir la PR, rejouer localement ce que la CI exécute :

   ```bash
   cd backend && PYTHONPATH=. pytest -q && git diff --exit-code
   cd frontend && npm ci && npm run lint:all && npm test && npm run build
   python scripts/afribench.py validate
   ```

3. Conventions : messages de commit et documentation **en français** ; toute interpolation de donnée dans du HTML passe par `escapeHtml()` (le lint le vérifie) ; aucun gestionnaire `on*=` en ligne ; migration Alembic idempotente pour tout changement de schéma ; chiffres de la documentation recomptés, pas recopiés.
4. Toute décision d'architecture nouvelle reçoit une fiche dans [`docs/ARCHITECTURE.md § 12`](docs/ARCHITECTURE.md#12-fiches-de-décision-pourquoi-ainsi).

## Licence et éthique

- Licence MIT pour le code ; licence du dataset provisoire (`other`), voir [`data/DATASET_CARD.md`](data/DATASET_CARD.md).
- Pas de contenu haineux, diffamatoire ou stéréotypé ; vigilance particulière sur la catégorie `raisonnement_culturel` (risque d'essentialisation, [`CRITIQUE.md § 1.8`](CRITIQUE.md)).
- Citer les sources.
- Les brouillons de traduction automatique (`draft_mt_unverified`) ne donnent **pas** de scores officiels ; le code l'impose.

## Contact

Issues GitHub : https://github.com/YTILIKAN/AfriBench/issues
Organisation : [Y'TILIKAN](https://ytilikan.com)
