# Questions — AfriBench

Ce dossier contient les jeux de questions du benchmark.

## Structure

```
data/questions/
├── template.json          # Modèle de référence pour chaque question
├── v1/                    # Version 1 du dataset
│   ├── raw/               # Questions brutes (avant validation)
│   └── validated/         # Questions validées et prêtes pour le benchmark
└── archive/               # Anciennes versions
```

## Format d'une question

Toute question doit suivre le template défini dans `template.json`.  
Les champs obligatoires sont : `id`, `category`, `question`, `options`, `answer`, `source`, `difficulty`.

## Catégories

| Catégorie | Code | Description |
|-----------|------|-------------|
| Histoire | HIST | Histoire africaine (précoloniale, coloniale, post-coloniale) |
| Géographie | GEOG | Géographie physique, politique et urbaine |
| Droit et Politique | POL | Systèmes juridiques, organisations continentales, gouvernance |
| Santé et Sciences | SANTE | Santé publique, épidémiologie, sciences africaines |
| Langue et Culture | LANG | Langues africaines, littérature, traditions culturelles |
| Économie | ECON | Économie africaine, développement, numérique |
| IA et Technologie | IA | Intelligence artificielle et tech en Afrique |
| Société | SOC | Démographie, éducation, urbanisation, médias |
| Raisonnement Culturel | CULT | Questions de logique et raisonnement contextuel africain |
