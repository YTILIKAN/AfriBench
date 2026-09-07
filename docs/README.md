# Documentation AfriBench — index

Ce dossier est la porte d'entrée de la documentation du projet. Chaque document a **un rôle et un seul** ; quand une information apparaît dans plusieurs documents, l'un d'eux fait foi et les autres s'y réfèrent. Le tableau ci-dessous indique lequel.

> **En clair.** Trois questions, trois documents. *Comment c'est construit et pourquoi ?* → l'architecture. *Qu'a-t-on fait, mesuré et appris ?* → le rapport technique. *Qu'est-ce qui cloche encore ?* → l'audit et la critique. Tout le reste est un guide pratique ou un protocole.

---

## Les documents, par rôle

| Document | Rôle | Fait foi pour | Public |
|---|---|---|---|
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | Plan de l'édifice : comment chaque composant est construit, et pourquoi ainsi. Seize fiches de décision, guide d'extension, glossaire. | Choix de conception · structure du code · **chiffres de volumétrie** (lignes, endpoints, tests) | Développeurs, auditeurs, contributeurs, décideurs |
| **[RAPPORT_TECHNIQUE.md](RAPPORT_TECHNIQUE.md)** | Ce qui a été fait et pourquoi ça compte : problème, mission, corpus, méthodologie, résultats et leur marge d'erreur, conduite du projet, bilan. Chaque section commence par un encadré « En clair ». | Résultats scientifiques · chronologie · **chiffres du corpus** (questions, catégories, modèles) | Tous publics, jury, partenaires |
| **[AUDIT_QUALITE.md](AUDIT_QUALITE.md)** | Audit vérifié par exécution : défauts corrigés (C1–C7, H1–H10, M*), défauts restants (R1–R33) avec reproduction et correctif recommandé, ordre de traitement. | **Dette technique** · état de chaque défaut | Mainteneurs, relecteurs |
| [../CRITIQUE.md](../CRITIQUE.md) | Autocritique publique du benchmark (juin 2026) : forces, faiblesses scientifiques, solutions. Document historique conservé tel quel, annoté. | Limites **scientifiques** du benchmark | Tous publics |
| [../ROADMAP.md](../ROADMAP.md) | Feuille de route actionnable, phase par phase, cases cochées. | État d'avancement | Contributeurs |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | Comment proposer une question, valider, traduire. | Format d'une contribution | Contributeurs |

## Guides pratiques

| Document | Contenu |
|---|---|
| [../README.md](../README.md) | Présentation du projet, démarrage rapide, index. |
| [../backend/README.md](../backend/README.md) | Service API : les 35 endpoints, configuration, base de données, jobs, sécurité, tests. |
| [../frontend/README.md](../frontend/README.md) | Interface : démarrage, chaîne de construction, conventions de code, qualité, backoffice, nginx. |
| [../scripts/README.md](../scripts/README.md) | Moteur d'évaluation et les 24 scripts (21 Python, 3 shell), par famille ; intégration LM Evaluation Harness. |
| [../data/README.md](../data/README.md) | Source de vérité : arborescence, contrat d'une question, invariants, sous-corpus. |
| [../configs/README.md](../configs/README.md) | `models.yaml` et `categories.yaml` : ajouter un modèle, un fournisseur, une catégorie. |
| [deploiement-railway.md](deploiement-railway.md) | Déploiement en production : deux services, variables, healthchecks, dépannage. |

## Protocoles et gouvernance

| Document | Contenu |
|---|---|
| [VALIDATION_PROTOCOL.md](VALIDATION_PROTOCOL.md) | Protocole de validation externe des questions (lots stratifiés, double annotation, κ). |
| [VALIDATORS.md](VALIDATORS.md) | Kit de recrutement des validateurs. |
| [ANNOTATOR_CONSENT.md](ANNOTATOR_CONSENT.md) | Consentement éclairé des annotateurs. |
| [templates/validator_outreach.md](templates/validator_outreach.md) | Modèle de message de sollicitation. |
| [../data/DATASET_CARD.md](../data/DATASET_CARD.md) | Carte de dataset (format Hugging Face). |
| [../CITATION.cff](../CITATION.cff) | Comment citer AfriBench. |

## Recherche et communication

| Document | Contenu |
|---|---|
| [../research/](../research/) | Notes de cadrage 01–08 (finalité, objectifs, phases, frameworks, pile technique, livrables, équipe, soumission académique), brouillon d'article, synthèse HTML. |
| [presentation/index.html](presentation/index.html) | Support de soutenance autonome, 32 diapositives (`← →`, `F` plein écran, `P` export PDF). |
| [presentation/NOTES_ORATEUR.md](presentation/NOTES_ORATEUR.md) | Déroulé, minutage, versions courtes, questions attendues. |
| [../rendus/](../rendus/) | PDF du rapport technique et du pitch. |

---

## Parcours de lecture conseillés

**Je découvre le projet (15 min).** [README](../README.md) → [Rapport technique, § 1 et § 2](RAPPORT_TECHNIQUE.md#1-résumé-exécutif) → encadrés « En clair » de l'[Architecture, § 1 à § 3](ARCHITECTURE.md#1-le-problème-que-le-système-résout).

**Je veux contribuer une question.** [CONTRIBUTING](../CONTRIBUTING.md) → [data/README](../data/README.md) → [Architecture, § 4.3 et § 14.4](ARCHITECTURE.md#43-le-contrat-dune-question).

**Je veux faire évoluer le code.** [Architecture](ARCHITECTURE.md) en entier, puis le README du composant concerné, puis [Audit, § 3](AUDIT_QUALITE.md#3-ce-qui-reste-à-améliorer) pour ne pas retomber dans un défaut connu.

**Je veux reproduire les résultats.** [Rapport technique, § 20](RAPPORT_TECHNIQUE.md#20-reproduire-le-projet--mode-opératoire) → [scripts/README](../scripts/README.md).

**Je veux déployer.** [deploiement-railway.md](deploiement-railway.md) → [Architecture, § 11](ARCHITECTURE.md#11-déploiement-et-exploitation) → [backend/README, § Configuration](../backend/README.md#configuration).

**J'évalue la solidité du projet.** [Audit](AUDIT_QUALITE.md) → [Critique](../CRITIQUE.md) → [Architecture, § 13](ARCHITECTURE.md#13-dette-technique-assumée-et-limites-de-conception).

---

## Règles de tenue de la documentation

1. **Un chiffre a une source.** Les chiffres de volumétrie du code (lignes, endpoints, tests, workflows) sont recomptés par exécution et consignés dans [ARCHITECTURE.md § 3.3](ARCHITECTURE.md#33-volumétrie-recomptée-le-7-septembre-2026) ; les chiffres du corpus dans [RAPPORT_TECHNIQUE.md, annexe C](RAPPORT_TECHNIQUE.md#annexe-c--récapitulatif-des-chiffres). Les autres documents les citent sans les redéfinir.
2. **Une décision a une fiche.** Tout choix structurant nouveau reçoit une fiche D*n* dans [ARCHITECTURE.md § 12](ARCHITECTURE.md#12-fiches-de-décision-pourquoi-ainsi) : contexte, décision, conséquences, alternatives écartées.
3. **Un défaut a un identifiant.** Les défauts connus portent un identifiant R*n* dans l'[audit](AUDIT_QUALITE.md) ; le code, les issues et les PR y renvoient.
4. **Chaque document porte sa date et sa version** en tête, et la met à jour à chaque modification substantielle.
5. **Le français est la langue de la documentation**, y compris les messages de commit ([D16](ARCHITECTURE.md#d16--tout-en-français)).

---

**AfriBench** · Y'TILIKAN · Index de documentation, 7 septembre 2026
