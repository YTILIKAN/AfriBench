---
title: AfriBench Leaderboard
emoji: 🌍
colorFrom: yellow
colorTo: orange
sdk: gradio
sdk_version: 4.44.0
app_file: app.py
pinned: false
license: other
short_description: Benchmark LLM sur les réalités africaines (prototype v0.1)
---

# AfriBench — Space Gradio

Leaderboard public du benchmark [AfriBench](https://github.com/YTILIKAN/AfriBench).

## Lancer en local

```bash
# Depuis la racine du monorepo
pip install -r hf_space/requirements.txt
python hf_space/app.py
# → http://127.0.0.1:7860
```

## Déployer sur Hugging Face Spaces

1. Créer un Space Gradio `YTILIKAN/AfriBench-Leaderboard`
2. Pousser le contenu de `hf_space/` à la racine du Space
3. Copier `frontend/data/results.json` vers `data/results.json` dans le Space
   (ou brancher un dataset HF plus tard)

Script d'aide depuis le monorepo :

```bash
python scripts/sync_hf_space_data.py
```

## Fichiers

| Fichier | Rôle |
|---------|------|
| `app.py` | UI Gradio |
| `utils.py` | Chargement résultats / dataframes |
| `about.py` | Méthodologie & citation |
| `requirements.txt` | Dépendances Space |
