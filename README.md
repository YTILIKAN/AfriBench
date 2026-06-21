# Frontend AfriBench

Dashboard statique pour visualiser les resultats du benchmark.

## Utilisation

```bash
# 1. Generer les donnees pour le frontend
python scripts/export_frontend.py

# 2. Servir le frontend (n'importe quel serveur statique)
cd frontend
python -m http.server 8000
# ou
npx serve .
```

Le dashboard est accessible sur `http://localhost:8000`.

## Structure

```
frontend/
├── index.html           # Page principale (SPA)
├── css/
│   └── style.css        # Theme Y'TILIKAN (dark navy + bronze)
├── js/
│   ├── app.js           # Initialisation, tabs, data loading
│   ├── leaderboard.js   # Classement avec scores et graphiques
│   ├── categories.js    # Performance par categorie (radar)
│   ├── compare.js       # Comparaison interactive de modeles
│   └── questions.js     # Navigateur de questions
└── data/
    ├── results.json     # Resultats d'evaluation (genere)
    └── questions.json   # Questions du benchmark (genere)
```

## Fonctionnalites

- **Classement** : tableau des modeles tries par score, avec barres de progression
- **Categories** : graphique radar comparant les modeles par categorie
- **Comparer** : selection interactive de modeles a comparer
- **Questions** : parcourir et filtrer les questions du benchmark

## Dependances

- Chart.js 4.x (charge depuis CDN)
- Aucun build tool requis

## Deploiement

Le frontend est une application statique. Deployable sur :
- GitHub Pages
- Hugging Face Spaces (Static)
- Netlify, Vercel
- N'importe quel serveur HTTP
