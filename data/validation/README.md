# Batches de validation externe (issue #5)

Ce dossier contient les batches JSONL assignés aux validateurs africains.

## Workflow

```bash
# 1. Générer un batch stratifié (40 questions)
python scripts/prepare_validation_batch.py \
  --size 40 --seed 1 --validator validator_a \
  --exclude-validated \
  --out data/validation/batch_01_validator_a.jsonl

# 2. Double annotation (overlap)
python scripts/prepare_validation_batch.py \
  --size 40 --validator validator_b \
  --overlap-from data/validation/batch_01_validator_a.jsonl \
  --out data/validation/batch_01_validator_b.jsonl

# 3. Calculer κ après relecture
python scripts/compute_inter_annotator.py \
  --batch-a data/validation/batch_01_validator_a_reviewed.jsonl \
  --batch-b data/validation/batch_01_validator_b_reviewed.jsonl

# 4. Appliquer les validations
python scripts/apply_validations.py \
  --batch data/validation/batch_01_validator_a_reviewed.jsonl \
  --export

# 5. Rapport de couverture
python scripts/validation_status.py --markdown docs/VALIDATION_STATUS.md
```

## Recrutement

Voir `docs/VALIDATORS.md` et `docs/templates/validator_outreach.md`.

Les fichiers `*_reviewed.jsonl` restent locaux (gitignored) tant que les validateurs n ont pas consenti (`docs/ANNOTATOR_CONSENT.md`).
