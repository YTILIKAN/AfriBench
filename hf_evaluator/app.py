#!/usr/bin/env python3
"""Stub — Space / service d'évaluation privée AfriBench.

Ne lance pas d'évaluation automatiquement (pas de clés dans le dépôt).
Utiliser scripts/afribench.py ou POST /api/v1/evaluate en production.
"""

from __future__ import annotations

import gradio as gr

GUIDE = """
# AfriBench Evaluator (privé)

Ce Space est un **point d'entrée documentaire**.

Pour évaluer un modèle :

1. Cloner [YTILIKAN/AfriBench](https://github.com/YTILIKAN/AfriBench)
2. Configurer les clés API (`.env`)
3. Lancer :

```bash
python scripts/afribench.py run --model <nom>
# ou
docker compose --profile eval run --rm eval run --model <nom>
```

4. Publier `data/results/*.json` puis régénérer le frontend / Space leaderboard :

```bash
python scripts/export_frontend.py
python scripts/sync_hf_space_data.py
```

Les soumissions publiques passent par des issues/PR GitHub — pas d'exécution
arbitraire de modèles ici.
"""


def create_app() -> gr.Blocks:
    with gr.Blocks(title="AfriBench Evaluator") as demo:
        gr.Markdown(GUIDE)
    return demo


if __name__ == "__main__":
    create_app().launch(server_name="0.0.0.0", server_port=7861)
