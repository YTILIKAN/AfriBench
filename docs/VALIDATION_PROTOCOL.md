# Protocole de validation des questions

## Schéma d'annotation

Chaque ligne JSONL (sortie de `prepare_validation_batch.py`) :

```json
{
  "id": "HIST-001",
  "verdict": "ok",
  "corrected_answer": null,
  "corrected_question": null,
  "corrected_options": null,
  "comment": "",
  "validator_id": "validator_a",
  "date": "2026-09-01"
}
```

| `verdict` | Signification |
|-----------|---------------|
| `ok` | Énoncé, options, réponse et explication corrects |
| `fix` | Correction mineure fournie dans les champs `corrected_*` |
| `reject` | Ambigu, obsolète, biaisé ou hors-sujet — à réécrire |

## Critères

1. **Exactitude factuelle** — source crédible ; pas d'anachronisme
2. **Une seule bonne réponse** — distracteurs plausibles mais clairement faux
3. **Ancrage africain** — pas de question générique « mondiale » déguisée
4. **Neutralité** — évite stéréotypes / essentialisation
5. **Difficulté cohérente** avec le label `easy|medium|hard`

## Champs écrits dans le corpus

Après `apply_validations.py` :

- `validated_by` : identifiant ou ORCID / nom court
- `date_validated` : `YYYY-MM-DD`
- `validation_notes` (optionnel) : commentaire court

Les items `reject` sont déplacés vers `data/questions/v1/rejected/` (non scorés).

## Accord inter-annotateurs

Sur le sous-échantillon double-annoté, viser κ de Cohen ≥ 0.7 sur le verdict
binaire ok vs (fix|reject). Documenter dans le paper / datasheet.
