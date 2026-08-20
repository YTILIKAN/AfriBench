# Questions témoins (baseline)

20 QCM **non-africains** (`is_control: true`) pour mesurer si un modèle est
simplement fort en QCM généraliste, ou spécifiquement performant sur l'Afrique.

## Usage

```bash
# Évaluer uniquement le set témoin
python scripts/afribench.py run --questions witness --model gpt-4o

# Valider
python scripts/afribench.py validate data/questions/v1/witness
```

Le delta `score_afrique − score_témoin` est la métrique comparative clé.

Ces questions **ne sont pas** mélangées au split principal (`validated/`)
ni au frontend par défaut ; elles sont exportées dans le dataset Hugging Face
(`control.jsonl`).
