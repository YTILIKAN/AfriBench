# 06. Livrables, risques et indicateurs de succès

## Livrables

| # | Livrable | Description |
|---|----------|-------------|
| 1 | **Corpus de test multilingue** | Jeux de données couvrant 5+ langues africaines, 8 catégories d'épreuves, 500+ questions par langue |
| 2 | **Pipeline d'évaluation automatisé** | Scripts reproductibles, environnement conteneurisé, orchestré via LM Evaluation Harness + DeepEval |
| 3 | **Tableau de bord public** | Site web responsive avec graphiques, filtres par modèle/langue/épreuve, export CSV |
| 4 | **Rapport méthodologique** | Documentation complète : protocole, métriques, taxonomie, guide de contribution |
| 5 | **Publication initiale** | Résultats sur 10+ modèles, article de blog, soumission conférence (ICLR, NeurIPS datasets) |
| 6 | **Dépôt GitHub** | Code open source, documentation, licence permissive, guide de contribution |

---

## Risques identifiés

| Risque | Niveau | Mitigation |
|--------|--------|------------|
| Disponibilité des locuteurs natifs | **Élevé** | Partenariats universitaires |
| Coût d'inférence des modèles | **Moyen** | Mutualisation, GPU partenaires |
| Reproductibilité cross-plateforme | **Moyen** | Conteneurisation, seeds fixes |
| Biais des données de test | **Élevé** | Comité de révision diversifié, audits |

---

## Indicateurs de succès

| Indicateur | Cible | Description |
|------------|-------|-------------|
| Couverture linguistique | >= 5 langues | Langues africaines évaluées dans le corpus initial |
| Modèles benchmarkés | >= 10 modèles | Modèles ouverts et propriétaires évalués à la release |
| Qualité du corpus | >= 85% | Taux d'approbation des épreuves par le comité de révision |
| Adoption | 500+ visiteurs | Visiteurs uniques du site dans le premier mois |
| Reproductibilité | 100% | Évaluations reproductibles via scripts conteneurisés |
| Communauté | >= 3 contributeurs | Contributeurs externes au corpus dans les 3 premiers mois |

---

[← Retour au README](../README.md)
