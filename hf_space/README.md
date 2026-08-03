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

```bash
# 1) Préparer le staging local (sans token)
./scripts/deploy_hf_space.sh

# 2) Publier (token write HF requis)
export HF_TOKEN=hf_xxx
export HF_SPACE_ID=YTILIKAN/AfriBench-Leaderboard   # optionnel
./scripts/deploy_hf_space.sh --push
```

Manuel équivalent :

1. Créer un Space Gradio `YTILIKAN/AfriBench-Leaderboard`
2. Pousser le contenu de `hf_space/` à la racine du Space
3. `python scripts/sync_hf_space_data.py` (copie `results.json` + `questions.json`)

Le classement public peut encore refléter des scores **seed** (sous-ensemble)
tant que les modèles n'ont pas été rejoués sur les 300 QCM.

## Fichiers

| Fichier | Rôle |
|---------|------|
| `app.py` | UI Gradio |
| `utils.py` | Chargement résultats / dataframes |
| `about.py` | Méthodologie & citation |
| `requirements.txt` | Dépendances Space |
