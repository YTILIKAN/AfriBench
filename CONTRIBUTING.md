# Contribuer à AfriBench

Merci de votre intérêt. AfriBench est un benchmark communautaire pour évaluer
les LLM sur les réalités africaines.

## Ways to contribute

| Voie | Doc |
|------|-----|
| Ajouter des questions QCM | Format ci-dessous + PR |
| **Valider** des questions | [`docs/VALIDATORS.md`](docs/VALIDATORS.md) |
| Traduire (SW / YO / AM) | [`data/questions/v1/translations/README.md`](data/questions/v1/translations/README.md) |
| Tâches non-QCM | [`data/questions/v1/open/README.md`](data/questions/v1/open/README.md) |
| Modèles / résultats | `configs/models.yaml` + `scripts/afribench.py` |
| Frontend / API | `frontend/`, `backend/` |

## Format d'une question QCM

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
  "date_created": "YYYY-MM-DD"
}
```

Placer le fichier dans `data/questions/v1/validated/<categorie>.json` (ou une PR
qui ajoute les items). Puis :

```bash
python scripts/afribench.py validate data/questions/v1/validated
python scripts/export_frontend.py
```

## Validation externe

```bash
python scripts/prepare_validation_batch.py --size 40 --out data/validation/batch_01.jsonl
# … revue humaine …
python scripts/apply_validations.py --batch data/validation/batch_01_reviewed.jsonl
```

## Licence & éthique

- Pas de contenu haineux, diffamatoire ou stéréotypé
- Citer les sources
- Les drafts MT (`draft_mt_unverified`) ne sont **pas** des scores officiels

## Contact

Issues GitHub : https://github.com/YTILIKAN/AfriBench/issues  
Organisation : [Y'TILIKAN](https://ytilikan.com)
