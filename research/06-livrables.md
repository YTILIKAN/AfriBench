# 06. Livrables, risques et indicateurs de succes

## Livrables

| # | Livrable | Description |
|---|----------|-------------|
| 1 | **Corpus de test multilingue** | Jeux de donnees couvrant 5+ langues africaines, 8 categories d'epreuves, 500+ questions par langue |
| 2 | **Pipeline d'evaluation automatise** | Scripts reproductibles, environnement conteneurise, orchestre via LM Evaluation Harness + DeepEval |
| 3 | **Tableau de bord public** | Site web responsive avec graphiques, filtres par modele/langue/epreuve, export CSV |
| 4 | **Rapport methodologique** | Documentation complete : protocole, metriques, taxonomie, guide de contribution |
| 5 | **Publication initiale** | Resultats sur 10+ modeles, article de blog, soumission conference (ICLR, NeurIPS datasets) |
| 6 | **Depot GitHub** | Code open source, documentation, licence permissive, guide de contribution |

---

## Risques identifies

| Risque | Niveau | Mitigation |
|--------|--------|------------|
| Disponibilite des locuteurs natifs | **Eleve** | Partenariats universitaires |
| Cout d'inference des modeles | **Moyen** | Mutualisation, GPU partenaires |
| Reproductibilite cross-plateforme | **Moyen** | Conteneurisation, seeds fixes |
| Biais des donnees de test | **Eleve** | Comite de revision diversifie, audits |

---

## Indicateurs de succes

| Indicateur | Cible | Description |
|------------|-------|-------------|
| Couverture linguistique | >= 5 langues | Langues africaines evaluees dans le corpus initial |
| Modeles benchmarkes | >= 10 modeles | Modeles ouverts et proprietaires evalues a la release |
| Qualite du corpus | >= 85% | Taux d'approbation des epreuves par le comite de revision |
| Adoption | 500+ visiteurs | Visiteurs uniques du site dans le premier mois |
| Reproductibilite | 100% | Evaluations reproductibles via scripts conteneurises |
| Communaute | >= 3 contributeurs | Contributeurs externes au corpus dans les 3 premiers mois |

---

[← Retour au README](../README.md)
