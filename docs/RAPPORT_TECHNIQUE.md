# AfriBench — Rapport technique

**Projet :** AfriBench — Évaluer les modèles de langage sur les réalités africaines
**Porteur :** Y'TILIKAN · [ytilikan.org](https://www.ytilikan.org/)
**Cadre :** Projet d'été Y'TILIKAN 2026 (cohorte de trois projets d'apprentissage)
**Version du produit :** Prototype v0.1
**Version du document :** 1.0 — 24 août 2026
**Échéance de validation :** 7 septembre 2026
**Dépôt :** [github.com/YTILIKAN/AfriBench](https://github.com/YTILIKAN/AfriBench)
**Démonstration publique :** [ytilikan.github.io/AfriBench](https://ytilikan.github.io/AfriBench/)
**Licence :** MIT

---

## Comment lire ce document

Ce rapport a deux lecteurs en tête, et il essaie de ne trahir ni l'un ni l'autre.

Le premier ne code pas. Il veut comprendre ce qui a été fait, pourquoi, et si c'est solide. Pour lui, chaque partie technique commence par un encadré **« En clair »** qui explique la même idée avec une image du quotidien — un examen, un thermomètre, un groupe électrogène. Ces encadrés se suffisent à eux-mêmes : on peut lire uniquement les « En clair » et sortir avec une compréhension juste du projet.

Le second lit du code. Il veut les chemins de fichiers, les chiffres exacts, les endpoints, les limites. Tout est là, dans les tableaux et les sections numérotées, avec les références précises au dépôt.

Un [glossaire](#annexe-a--glossaire) en annexe traduit les termes techniques. Les chiffres cités ont été recomptés sur le dépôt à la date du document, pas repris de la documentation existante.

**Fil rouge du document.** Un benchmark, c'est un examen. Nous avons écrit le sujet, rédigé le règlement, convoqué les candidats, corrigé les copies et publié le palmarès. Tout le rapport suit cette métaphore, section après section.

---

## Table des matières

1. [Résumé exécutif](#1-résumé-exécutif)
2. [Le problème : un examen écrit ailleurs](#2-le-problème--un-examen-écrit-ailleurs)
3. [Alignement avec la mission Y'TILIKAN](#3-alignement-avec-la-mission-ytilikan)
4. [Objectifs et périmètre](#4-objectifs-et-périmètre)
5. [Le corpus : le sujet d'examen](#5-le-corpus--le-sujet-dexamen)
6. [La méthodologie : le règlement d'examen](#6-la-méthodologie--le-règlement-dexamen)
7. [Les résultats : le palmarès et sa marge d'erreur](#7-les-résultats--le-palmarès-et-sa-marge-derreur)
8. [Architecture logicielle](#8-architecture-logicielle)
9. [Le backend : le guichet](#9-le-backend--le-guichet)
10. [Le frontend : la salle d'exposition](#10-le-frontend--la-salle-dexposition)
11. [Interface et expérience utilisateur](#11-interface-et-expérience-utilisateur)
12. [Le hub participatif : l'arbre à palabres numérique](#12-le-hub-participatif--larbre-à-palabres-numérique)
13. [Qualité, tests et intégration continue](#13-qualité-tests-et-intégration-continue)
14. [Déploiement et exploitation](#14-déploiement-et-exploitation)
15. [Diffusion scientifique et ouverture](#15-diffusion-scientifique-et-ouverture)
16. [Gouvernance, éthique et conformité](#16-gouvernance-éthique-et-conformité)
17. [Conduite du projet](#17-conduite-du-projet)
18. [Limites connues](#18-limites-connues)
19. [Feuille de route](#19-feuille-de-route)
20. [Reproduire le projet : mode opératoire](#20-reproduire-le-projet--mode-opératoire)
21. [Bilan pédagogique](#21-bilan-pédagogique)
22. [Annexes](#annexe-a--glossaire)

---

## 1. Résumé exécutif

### 1.1 En une phrase

AfriBench est un examen public, gratuit et reproductible qui mesure ce que les intelligences artificielles conversationnelles savent réellement de l'Afrique francophone — et qui rend ce verdict lisible par tout le monde.

### 1.2 Ce qui existe aujourd'hui

| Livrable | État | Chiffre clé |
|---|---|---|
| Corpus de questions à choix multiples ancrées en Afrique | Constitué | **350** questions, 9 matières, 99 sous-thèmes |
| Questions témoins non africaines (calibrage) | Constitué | **20** questions |
| Tâches ouvertes pilotes (hors QCM) | Pilote | **25** items, 6 types de tâches |
| Amorces de traduction (swahili, yorùbá, amharique) | Amorce non validée | **9** items (3 par langue) |
| Moteur d'évaluation en ligne de commande | Opérationnel | 3 familles d'API, 8 modèles configurés |
| Modèles évalués et publiés | Publié | **7** modèles |
| API publique de lecture | Opérationnelle | **35** endpoints |
| Site web public | En ligne | 10 vues, 4 espaces de travail |
| Backoffice d'administration | Opérationnel | 5 écrans |
| Analyse statistique (intervalles de confiance, tests appariés) | Opérationnelle | Bootstrap 2 000 réplicats, 21 comparaisons McNemar |
| Intégration à l'écosystème de recherche | Opérationnelle | LM Evaluation Harness, dataset Hugging Face, Space Gradio |
| Tests automatisés | Opérationnels | 61 tests backend, 30+ cas frontend |
| Chaînes d'intégration et de déploiement continus | Opérationnelles | 7 workflows GitHub Actions |
| Documentation | Complète | 5 documents de protocole, 10 notes de recherche |

### 1.3 Le résultat scientifique, en une ligne

Sur l'échantillon d'amorçage de 101 questions, sept modèles de langage majeurs se situent entre **90,1 %** et **96,0 %** de bonnes réponses. Les intervalles de confiance des deux premiers se chevauchent : **on ne peut pas conclure qu'un modèle est meilleur que l'autre**. C'est un résultat en soi, et nous le publions tel quel.

### 1.4 Le résultat d'ingénierie

Une chaîne complète, de la question écrite à la main jusqu'au graphique affiché dans un navigateur, entièrement reproductible par un tiers avec une seule commande. 151 commits, 28 pull requests fusionnées, 17 issues traitées et fermées, en un peu moins de quatre mois.

### 1.5 Ce que nous assumons ne pas encore avoir

Trois manques sont documentés publiquement dans [`CRITIQUE.md`](../CRITIQUE.md) et affichés sur le site lui-même :

1. **Aucune validation externe effective.** Le protocole, les documents de consentement et les scripts de recrutement existent ; les validateurs, pas encore. Couverture : 0 %.
2. **Les scores publics portent sur 101 questions, pas sur les 350.** Le corpus a triplé après la campagne d'évaluation ; les modèles n'ont pas encore été rejoués.
3. **Le français est la seule langue avec des scores officiels.** Les amorces swahili, yorùbá et amharique sont des brouillons de traduction automatique, explicitement marqués comme non officiels.

Nous considérons que dire cela clairement fait partie du livrable.

---

## 2. Le problème : un examen écrit ailleurs

### 2.1 Le constat

Un modèle de langage — ChatGPT, Claude, Gemini, DeepSeek — n'est pas évalué au hasard. La communauté scientifique le fait passer des batteries de tests standardisés, appelés *benchmarks*. Les plus cités s'appellent MMLU, HellaSwag, HumanEval, ARC.

Ces tests ont deux propriétés en commun : ils sont écrits en anglais, et ils portent sur des réalités qui ne sont pas les nôtres. On y interrogera le modèle sur la Constitution américaine, la Guerre de Sécession, le baseball, la jurisprudence de la Cour suprême. Très rarement sur l'Empire du Mali, le droit OHADA, le paludisme, la CEMAC ou la place du proverbe dans la résolution d'un conflit villageois.

> **En clair.** Imaginez un concours national dont le sujet a été rédigé à l'étranger par des gens qui n'ont jamais vécu ici. Les questions portent sur leur histoire, leur droit, leurs sports, leurs proverbes. Vous pouvez y obtenir 95 %. Cela ne dit rien de ce que vous savez de votre propre pays. Les benchmarks LLM actuels sont exactement ce concours-là.

### 2.2 Pourquoi cela ne relève pas de la coquetterie identitaire

Le problème est opérationnel, et il coûte cher.

Les modèles de langage sont en train d'entrer dans l'école, la santé, l'administration, le journalisme et le service client en Afrique francophone. Or **ce qui n'est pas mesuré n'est pas amélioré**. Si aucun test public ne révèle qu'un modèle confond l'Empire du Ghana et le Ghana contemporain, ou qu'il ignore le fonctionnement du droit foncier coutumier, alors :

- les entreprises et administrations qui les déploient le font à l'aveugle, sans savoir où sont les angles morts ;
- les laboratoires qui les construisent n'ont aucun signal les incitant à combler ces lacunes ;
- les utilisateurs africains encaissent silencieusement des erreurs qu'ils ne sont pas toujours en position de détecter ;
- et le récit selon lequel « l'IA sait déjà tout » reste invérifiable, donc incontestable.

### 2.3 Le vide précis que nous occupons

Il existe des travaux sur l'Afrique et le NLP : Masakhane, AfriMMLU, AfroBench (McGill-NLP, EMNLP 2024), IrokoBench. Ces travaux sont excellents et majoritairement anglophones ou centrés sur les langues africaines à faibles ressources.

Le créneau d'AfriBench est différent et complémentaire : **la connaissance factuelle et le raisonnement contextuel, en français, sur les réalités du continent**. C'est-à-dire précisément la langue de travail de plus de vingt pays africains et de leurs administrations, et précisément l'angle que personne n'occupait.

Nous documentons explicitement la proximité de nom avec AfroBench dans [`CRITIQUE.md`](../CRITIQUE.md) § 1.7, avec la différenciation de positionnement.

---

## 3. Alignement avec la mission Y'TILIKAN

### 3.1 La mission telle qu'elle est formulée

Y'TILIKAN énonce quatre verbes et une vision.

Les quatre verbes : **Informer**, **Former**, **Partager**, **Valoriser**.
La vision : *« Comprendre la technologie, la maîtriser, puis la créer. Pour que l'Afrique façonne la tech au lieu de la subir. »*
La devise, empruntée à Francis Bacon : *« Le savoir, c'est le pouvoir. »*

### 3.2 La correspondance, point par point

| Verbe de la mission | Ce qu'AfriBench en fait concrètement |
|---|---|
| **Informer** | Publier des mesures vérifiables, pas des impressions. Un classement public, des scores par matière, des intervalles de confiance, et une page « Méthodologie » qui explique comment chaque chiffre a été obtenu. Le contraire du marketing des laboratoires d'IA. |
| **Former** | Le projet est d'abord un support d'apprentissage. Six personnes ont traversé une chaîne technique complète : conception de données, appels d'API, statistiques inférentielles, API REST, base de données, interface web, conteneurisation, intégration continue, déploiement. Le dépôt est le cahier de cette formation. |
| **Partager** | Licence MIT. Corpus, code, résultats, protocoles, échecs : tout est public sur GitHub, exporté vers Hugging Face, et compatible avec l'outil standard de la communauté (LM Evaluation Harness). Y compris `CRITIQUE.md`, qui liste nos propres faiblesses. |
| **Valoriser** | Les questions valorisent le patrimoine intellectuel africain : sources UNESCO, historiens africains, textes juridiques régionaux. Le protocole prévoit un co-crédit d'auteur pour les validateurs africains. Les langues africaines ont une place dans l'architecture avant même d'avoir des scores. |

### 3.3 La vision, comme séquence de travail

La vision de Y'TILIKAN décrit trois étapes. AfriBench les a parcourues dans l'ordre.

**Comprendre.** On ne peut pas discuter d'une technologie qu'on ne mesure pas. Construire un instrument de mesure est le geste inaugural de la compréhension. Avant AfriBench, l'affirmation « les IA connaissent mal l'Afrique » était une intuition. Elle est maintenant une hypothèse testable, avec un protocole et des chiffres.

**Maîtriser.** L'équipe n'a pas consommé un outil d'évaluation existant : elle en a construit un. Le moteur d'évaluation (`scripts/afribench.py`), le service API, l'interface, le pipeline statistique, la chaîne de déploiement — tout a été écrit, cassé, corrigé, testé.

**Créer.** Le résultat est un artefact africain que d'autres peuvent réutiliser : un dataset citable ([`CITATION.cff`](../CITATION.cff)), une tâche intégrée à l'outillage standard de la recherche, un classement public. Nous ne commentons pas le travail des autres ; nous produisons le nôtre.

> **En clair.** La devise « le savoir, c'est le pouvoir » a une conséquence pratique très concrète : celui qui tient la balance tient le débat. Tant que ce sont les fabricants d'IA qui écrivent leurs propres examens et annoncent leurs propres notes, personne ne peut les contredire. AfriBench est une balance qui ne leur appartient pas.

### 3.4 Les cinq valeurs, et leur trace dans le code

Les valeurs affichées par Y'TILIKAN ne sont pas des slogans dans ce projet ; chacune a une contrepartie technique identifiable.

| Valeur | Traduction technique dans le dépôt |
|---|---|
| **Résilience** | Le site fonctionne même si l'API tombe (repli sur des fichiers JSON), et même sans base de données (repli sur le disque). Les évaluations interrompues par un redémarrage sont détectées et relancées. Le frontend démarre même si le backend est absent. |
| **Passion** | 102 des 151 commits ont été faits en août, dont 45 en une seule journée. Le projet a été mené en parallèle d'autres engagements. |
| **Innovation** | Une catégorie « Raisonnement culturel » qui n'existe dans aucun benchmark occidental. Un hub de propositions à vote communautaire. Un mode dégradé pensé pour des connexions instables. |
| **Engagement** | `CRITIQUE.md` : un document public de 17 000 caractères qui énumère nos propres faiblesses, avec leur gravité. Une bannière « prototype » assumée en haut du site. Un protocole de consentement pour les annotateurs. |
| **Culture** | Sources : *Histoire Générale de l'Afrique* de l'UNESCO, chercheurs africains, textes régionaux. Nom de code du projet frère : *Dira*, « boussole » en swahili. Interface intégralement en français. |

### 3.5 Place dans le projet d'été

Le projet d'été Y'TILIKAN 2026 comprend trois projets menés en parallèle, plus un laboratoire :

| Projet | Objet | Lead |
|---|---|---|
| **AfriBench** | Évaluer les LLM sur les connaissances africaines francophones | Christian NEBOT · Michel Azarias |
| **AfroLang-Library** | Bibliothèque navigable de datasets de langues africaines | Stelle Matha · Balla Moussa Keita · Bayard Ombgwa Kuddy |
| **AfroTech-Pulse** | Veille IA Afrique + newsletter hebdomadaire automatisée | Hilary Cynthia · Hamel Brayan · Steeve Junix |
| *Dira Browser* (laboratoire) | Navigateur pédagogique basé sur Chromium, focus confidentialité | Christian NEBOT |

Les trois projets partagent un même ADN méthodologique : un dépôt public, une documentation en français, une gouvernance ouverte aux contributions, et l'obligation de produire un artefact réutilisable — pas une démonstration jetable. AfriBench est le maillon « mesure » de cet ensemble : AfroLang fournit la matière linguistique, AfroTech-Pulse suit l'actualité, AfriBench établit les faits.

---

## 4. Objectifs et périmètre

### 4.1 Objectifs déclarés au lancement

Les objectifs figurent dans [`research/02-objectifs.md`](../research/02-objectifs.md). Six items :

1. Définir un cadre d'évaluation multi-dimensions adapté au contexte africain.
2. Sélectionner les frameworks et métriques appropriés.
3. Construire un corpus multi-tâches.
4. Intégrer les langues africaines.
5. Définir une grille de scoring.
6. Livrer un site de visualisation publique.

### 4.2 État d'avancement à la date du rapport

| Objectif | État | Preuve dans le dépôt |
|---|---|---|
| 1. Cadre multi-dimensions | **Atteint** | 9 catégories + 3 niveaux de difficulté, [`configs/categories.yaml`](../configs/categories.yaml) |
| 2. Frameworks et métriques | **Atteint** | Étude comparative de 10 frameworks ([`research/04-frameworks.md`](../research/04-frameworks.md)), intégration LM Eval Harness effective |
| 3. Corpus multi-tâches | **Atteint pour le QCM, pilote pour l'ouvert** | 350 QCM + 25 items ouverts sur 6 types de tâches |
| 4. Langues africaines | **Amorcé** | Architecture, API et exports prêts ; 9 items en brouillon non validé |
| 5. Grille de scoring | **Atteint** | Accuracy, ventilation par catégorie et difficulté, bootstrap, McNemar, grilles LLM-as-judge |
| 6. Site de visualisation | **Atteint** | Site public en ligne, 10 vues, API 35 endpoints |

### 4.3 Ce qui est explicitement hors périmètre de la v0.1

- **Entraîner ou affiner un modèle.** AfriBench mesure, il ne fabrique pas de modèles.
- **Évaluer la toxicité, les biais sociaux ou la sûreté.** Sujets légitimes, hors du champ de la connaissance factuelle.
- **Comparer les coûts, les latences ou l'empreinte carbone.** Non instrumenté.
- **Publier des scores officiels dans une langue autre que le français.** Interdit par notre propre protocole tant qu'un locuteur natif n'a pas vérifié les traductions.

---

## 5. Le corpus : le sujet d'examen

> **En clair.** Avant d'organiser un concours, il faut écrire le sujet. C'est la partie la plus lente et la moins spectaculaire du travail : 350 questions rédigées une par une, chacune avec quatre propositions de réponse, une explication et une source vérifiable. C'est aussi la partie qui donne toute sa valeur au reste. Un beau site posé sur de mauvaises questions ne vaut rien.

### 5.1 Volumétrie

| Ensemble | Emplacement | Nombre |
|---|---|---|
| QCM africains validés | `data/questions/v1/validated/` (9 fichiers) | **350** |
| QCM témoins non africains | `data/questions/v1/witness/temoin.json` | **20** |
| Brouillons initiaux (ayant servi à l'évaluation d'amorçage) | `data/questions/v1/raw/` | **101** |
| Tâches ouvertes pilotes | `data/questions/v1/open/` (6 fichiers) | **25** |
| Amorces de traduction | `data/questions/v1/translations/{sw,yo,am}/` | **9** |
| **Total exportable vers Hugging Face** | `data/hf/YTILIKAN__AfriBench/` | **370** |

### 5.2 Les neuf matières

Les catégories sont définies dans [`configs/categories.yaml`](../configs/categories.yaml), avec un libellé, une description et une couleur d'affichage.

| Catégorie | Code | Questions | Exemples de sous-thèmes |
|---|---|---:|---|
| Histoire | HIST | 41 | Empires précoloniaux, colonisation, indépendances |
| Géographie | GEOG | 41 | Physique, politique, urbaine |
| Langue et Culture | LANG | 40 | Langues africaines, littérature, oralité |
| Droit et Politique | POL | 38 | Institutions, intégration régionale, gouvernance |
| Économie | ECON | 38 | Développement, numérique, matières premières |
| Santé et Sciences | SANTE | 38 | Santé publique, épidémiologie |
| IA et Technologie | IA | 38 | Écosystème tech africain |
| Société | SOC | 38 | Démographie, éducation, médias |
| Raisonnement Culturel | CULT | 38 | Logique contextuelle, sagesse, proverbes |
| *Témoin (baseline)* | *CTRL* | *20* | *Hors scoring principal* |

Le corpus compte **99 sous-catégories distinctes**. Les plus représentées : `physique` (17), `integration` (13), `empires_precoloniaux` (13), `langues` (13), `sante_publique` (12).

La catégorie **Raisonnement Culturel** mérite un mot. Elle ne teste pas un fait mémorisable mais la capacité à raisonner dans un cadre culturel donné : interpréter un proverbe, comprendre une logique de médiation communautaire, saisir une convenance sociale. Aucun benchmark occidental n'a d'équivalent. C'est aussi, nous l'assumons, la catégorie la plus délicate : elle risque d'essentialiser « une » culture africaine là où il en existe des milliers. Ce risque est documenté dans [`CRITIQUE.md`](../CRITIQUE.md) § 1.8 et sa mitigation dépend directement de la validation externe.

### 5.3 Répartition par difficulté

| Difficulté | Nombre | Part |
|---|---:|---:|
| Facile | 102 | 29,1 % |
| Moyen | 136 | 38,9 % |
| Difficile | 112 | 32,0 % |

La répartition est volontairement équilibrée dans chaque matière (entre 10 et 17 questions par niveau et par catégorie), afin qu'un modèle ne puisse pas obtenir un bon score global en excellant seulement sur les questions faciles d'une matière surreprésentée.

### 5.4 Anatomie d'une question

Chaque question est un objet JSON. Le gabarit de référence est [`data/questions/template.json`](../data/questions/template.json).

```json
{
  "id": "HIST-001",
  "category": "histoire",
  "subcategory": "empires_precoloniaux",
  "difficulty": "medium",
  "language": "fr",
  "question": "Quel empire ouest-africain était réputé pour sa richesse en or et sa ville universitaire de Tombouctou au XIVe siècle ?",
  "options": { "A": "Empire du Ghana", "B": "Empire du Mali", "C": "Empire Songhaï", "D": "Royaume du Bénin" },
  "answer": "B",
  "explanation": "L'Empire du Mali, sous le règne de Mansa Moussa...",
  "source": "UNESCO Histoire Générale de l'Afrique, Vol. IV",
  "author": "afribench",
  "date_created": "2026-06-04",
  "date_validated": null,
  "validated_by": null
}
```

Deux champs portent l'essentiel de l'exigence méthodologique :

- **`source`** — chaque question renvoie à une référence vérifiable. C'est ce qui distingue un corpus de benchmark d'un quiz de culture générale. Les sources dominantes sont l'*Histoire Générale de l'Afrique* de l'UNESCO, des travaux d'universitaires africains, et des textes juridiques et statistiques régionaux.
- **`explanation`** — la justification de la bonne réponse. Elle rend la question auditable : n'importe qui peut contester notre corrigé.

Les champs `date_validated` et `validated_by` sont **présents et vides**. Ce n'est pas un oubli : c'est la trace visible et machine-lisible du fait que la validation externe n'a pas encore eu lieu. Le script [`scripts/validation_status.py`](../scripts/validation_status.py) les compte et publie une couverture de 0 %.

### 5.5 Les questions témoins : le thermomètre

> **En clair.** Comment savoir si un thermomètre est fiable ? On le plonge dans l'eau bouillante. S'il n'affiche pas 100 °C, le problème est dans l'instrument, pas dans l'eau. Les 20 questions témoins jouent ce rôle : ce sont des questions de culture générale mondiale, non africaines, de difficulté comparable. Si un modèle obtient 95 % sur les témoins et 60 % sur l'Afrique, l'écart mesure un déficit de connaissance africaine. Mais s'il obtient 60 % sur les deux, notre sujet est simplement trop dur, et le problème vient de nous.

Détail technique :

| Propriété | Valeur |
|---|---|
| Fichier | `data/questions/v1/witness/temoin.json` |
| Identifiants | `CTRL-001` à `CTRL-020` |
| Marqueur | `is_control: true` sur les 20 items |
| Répartition | 8 faciles, 8 moyens, 4 difficiles |
| Exécution | Passe séparée : `python scripts/afribench.py run --questions witness --model <nom>` |
| Traitement | **Jamais mélangées** au classement principal ; export distinct (`control.jsonl`) |
| Métrique cible | `score_afrique − score_témoin` |

### 5.6 Les tâches ouvertes : au-delà du QCM

Un QCM a une vertu — il se corrige automatiquement et sans ambiguïté — et un défaut majeur : **il permet de deviner**. Avec quatre options, le hasard rapporte déjà 25 %. Et surtout, un QCM ne dit rien de la capacité à *produire* : expliquer, traduire, résumer, nuancer.

Six familles de tâches ouvertes ont donc été amorcées :

| Fichier | Type de tâche | Items | Métrique visée |
|---|---|---:|---|
| `open_v1.json` | Génération ouverte | 10 | Grille LLM-as-judge |
| `open_qa_v1.json` | Question-réponse ouverte | 3 | Token F1 + juge |
| `translation_v1.json` | Traduction | 3 | BLEU / COMET |
| `summarization_v1.json` | Résumé | 3 | ROUGE-L / BERTScore |
| `ner_v1.json` | Reconnaissance d'entités nommées | 3 | F1 entités |
| `sentiment_v1.json` | Analyse de sentiment | 3 | Accuracy / macro-F1 |

Les items de génération ouverte portent une **grille de notation explicite** (`rubric`) :

```json
"rubric": { "exactitude": 4, "profondeur": 3, "nuance_culturelle": 3 },
"max_score": 10,
"reference_points": ["...", "..."]
```

La correction est confiée à un modèle juge ([`scripts/judges/llm_as_judge.py`](../scripts/judges/llm_as_judge.py)), qui note chaque réponse sur les trois axes et joint une justification. C'est un correcteur automatique dont on peut relire la copie.

**Statut assumé :** ces 25 items sont un pilote. Le mode dry-run actuel donne des scores de 1,0 parce qu'il compare la référence à elle-même. Ces chiffres sont donc **techniquement corrects et scientifiquement dénués de sens** ; l'interface les marque comme tels avec un badge « dry-run » explicite. Le pilote valide le tuyau, pas le contenu.

### 5.7 Les amorces multilingues

| Langue | Code | Items | Statut déclaré |
|---|---|---:|---|
| Swahili | `sw` | 3 | `draft_mt_unverified` |
| Yorùbá | `yo` | 3 | `draft_mt_unverified` |
| Amharique | `am` | 3 | Marqueurs en attente de locuteur natif |

Les trois langues traduisent les mêmes questions sources (`HIST-001`, `GEOG-024`, `POL-017`), ce qui permettra de comparer les performances sur un contenu identique. Le champ `translation_of` maintient le lien vers l'original français.

Ces items sont **exclus par construction du classement officiel** : l'endpoint `GET /api/v1/translations/manifest` renvoie `official: false` tant qu'aucun locuteur natif n'a validé. Publier des scores sur une traduction automatique non relue serait produire du bruit et l'appeler mesure.

### 5.8 Versionnement du corpus

Le corpus porte un numéro de version dans [`data/questions/v1/manifest.json`](../data/questions/v1/manifest.json). Ce champ `seed_version` sert de contrat entre le disque et la base de données : au démarrage, le backend ne remplace une question en base que si la version du fichier est plus récente **et** si la question n'a pas été verrouillée par un administrateur (`locked_by_admin`).

> **En clair.** Le fichier est la source de vérité, mais une correction faite à la main dans le backoffice ne doit pas être écrasée au prochain redémarrage. Le verrou protège le travail humain contre l'automatisme.

*Incohérence connue :* le manifeste mentionne encore « 300 QCM » alors que le corpus en compte 350. À corriger.

---

## 6. La méthodologie : le règlement d'examen

> **En clair.** Un concours n'a de valeur que si tous les candidats passent la même épreuve, dans les mêmes conditions, avec le même corrigé. S'agissant d'IA, cela veut dire : même formulation de consigne, même température, même façon de lire la copie, et un mode opératoire écrit qui permet à n'importe qui de tout refaire et de retomber sur nos chiffres. Le protocole complet tient dans un script de 627 lignes et une page du site.

### 6.1 Le moteur d'évaluation

Tout passe par [`scripts/afribench.py`](../scripts/afribench.py), une interface en ligne de commande à cinq sous-commandes :

```bash
python scripts/afribench.py run          [--model NOM] [--questions v1|witness] [--few-shot N] [--mock] [--verbose]
python scripts/afribench.py leaderboard  [--top-n N] [--include-mock]
python scripts/afribench.py list-models
python scripts/afribench.py validate     [CHEMIN]
python scripts/afribench.py export       [--format json|csv|markdown]
```

### 6.2 Les conditions d'examen

| Paramètre | Valeur | Justification |
|---|---|---|
| Format | QCM à 4 options (A–D) | Correction automatique sans ambiguïté |
| Régime | Zero-shot par défaut | Mesurer la connaissance, pas l'adaptation au format |
| Few-shot | Optionnel, `--few-shot N` (0–10) | Pour étudier l'effet du contexte |
| **Température** | **0,0** pour tous les modèles | Élimine l'aléa de génération : deux exécutions donnent le même résultat |
| Tokens maximum | 256 | Une lettre suffit ; la marge absorbe les modèles bavards |
| Cadence | 0,5 s entre deux questions | Respect des limites de débit des fournisseurs |
| Réessais | 5 tentatives, back-off exponentiel (5/15/25/35 s sur HTTP 429) | Une saturation temporaire du fournisseur ne doit pas invalider une campagne |

### 6.3 La consigne exacte

```
Vous êtes un assistant spécialisé dans l'évaluation des connaissances
sur l'Afrique. Répondez UNIQUEMENT par la lettre de la bonne réponse
(A, B, C ou D), sans justification, sans ponctuation, sans note.

Question : {question}
A. {option_a}
B. {option_b}
C. {option_c}
D. {option_d}
Réponse :
```

Cette consigne est **identique pour les huit modèles** et **identique dans les deux moteurs d'exécution** (notre CLI et la tâche LM Evaluation Harness), ce qui garantit que les deux voies produisent des chiffres comparables. Le prompt est reproduit dans [`scripts/lm_eval_tasks/afribench/utils.py`](../scripts/lm_eval_tasks/afribench/) pour cette raison précise.

### 6.4 Lire la copie

Un modèle à qui on demande une lettre ne répond pas toujours par une lettre. Il écrit « B. Empire du Mali », ou « La réponse est B », ou « **B** ». La fonction `extract_answer` applique donc une cascade de cinq règles, de la plus stricte à la plus permissive :

1. La réponse est exactement `A`, `B`, `C` ou `D`.
2. Elle commence par `A.`, `A)` ou `A:`.
3. Elle contient une formule du type « LA RÉPONSE EST X ».
4. Premier caractère A–D isolé trouvé dans le texte.
5. Échec → la réponse est comptée comme **`no_answer`**, ni juste ni fausse.

> **En clair.** Un candidat qui écrit hors du cadre prévu ne doit pas être crédité par erreur, mais ne doit pas non plus être pénalisé pour un simple défaut de forme. La catégorie `no_answer` est notre copie « illisible » : elle est comptée à part et publiée. Mistral Large en a produit 3 sur 101 ; c'est visible dans le classement.

### 6.5 Les métriques

| Métrique | Définition | Où elle apparaît |
|---|---|---|
| **Accuracy globale** | bonnes réponses / total | Classement principal |
| **Accuracy par catégorie** | idem, restreint à une matière | Radar, graphique par catégorie, vue Comparer |
| **Accuracy par difficulté** | idem, restreint à un niveau | Graphique par difficulté |
| `correct` / `incorrect` / `no_answer` | Décompte brut | Colonne « Questions » du classement |
| **Écart-type inter-catégories** | Régularité du modèle | Colonne dédiée, colorée (vert/ambre/rouge) |
| **Intervalle de confiance 95 %** | Bootstrap, 2 000 réplicats | Rapport statistique, onglet Statistiques du Space |
| **Test de McNemar** | Comparaison appariée de deux modèles | 21 paires analysées |

L'écart-type inter-catégories est un indicateur volontairement mis en avant : un modèle à 92 % homogène sur les neuf matières n'est pas le même produit qu'un modèle à 92 % qui plafonne à 100 % en raisonnement culturel et s'effondre en droit.

### 6.6 Reproductibilité

> **En clair.** Une recette de cuisine n'a de valeur que si un autre cuisinier, dans une autre cuisine, obtient le même plat. C'est le sens de la reproductibilité scientifique. Nous avons donc emballé la recette *et* la cuisine.

Quatre niveaux de reproductibilité ont été mis en place :

1. **Une commande unique.** [`scripts/reproduce.sh`](../scripts/reproduce.sh) enchaîne : création d'un environnement virtuel, installation des dépendances, chargement des clés, validation du corpus, évaluation, calcul du classement, export vers le frontend, génération du HTML statique, synchronisation du Space Hugging Face.

2. **Un mode sans clé d'API.** `./scripts/reproduce.sh --mock` produit des résultats déterministes (graine dérivée du hash SHA-256 du nom du modèle) pour tester la chaîne complète sans dépenser un centime. Les résultats simulés sont écrits dans `data/results/mock/` et exclus du classement par défaut — impossible de les confondre avec de vraies mesures.

3. **Un conteneur.** Le [`Dockerfile`](../Dockerfile) racine construit une image `afribench:eval` avec Python 3.12, `PYTHONHASHSEED=0` et `AFRIBENCH_SEED=42`. L'environnement d'exécution est figé, pas seulement le code.

4. **Un standard communautaire.** L'intégration LM Evaluation Harness (`scripts/lm_eval_tasks/afribench/`) permet d'exécuter AfriBench avec l'outil de référence de la communauté, sans nous faire confiance :

```bash
lm_eval --model openai-chat-completions --model_args model=gpt-4o \
        --tasks afribench --include_path scripts/lm_eval_tasks/ --num_fewshot 0
```

Onze tâches sont exposées : `afribench` (350 items), `afribench_all` (groupe), et `afribench_<catégorie>` pour les 9 matières.

### 6.7 Le protocole de validation externe

Le dispositif est écrit et outillé ; il attend ses participants.

**Documents.** [`docs/VALIDATION_PROTOCOL.md`](VALIDATION_PROTOCOL.md) (critères et schéma de verdict), [`docs/VALIDATORS.md`](VALIDATORS.md) (profils recherchés et canaux de recrutement), [`docs/ANNOTATOR_CONSENT.md`](ANNOTATOR_CONSENT.md) (consentement éclairé), [`docs/templates/validator_outreach.md`](templates/validator_outreach.md) (courriel type).

**Critères de jugement.** Exactitude factuelle · unicité de la bonne réponse · ancrage africain réel · neutralité (absence de stéréotype) · cohérence du niveau de difficulté annoncé.

**Verdicts possibles.** `ok` (accepté) · `fix` (à corriger, avec proposition) · `reject` (écarté, déplacé vers `data/questions/v1/rejected/`).

**Outillage.** `prepare_validation_batch.py` (constitue un lot tiré aléatoirement à graine fixée), `apply_validations.py` (applique les verdicts), `compute_inter_annotator.py` (calcule le κ de Cohen), `validation_status.py` (publie la couverture).

**Seuil de qualité.** Au moins 20 % des items sont doublement annotés, avec une exigence de **κ de Cohen ≥ 0,7**.

> **En clair.** Le κ de Cohen mesure si deux correcteurs sont d'accord au-delà du hasard. S'ils s'accordent parce qu'ils cochent tous les deux « ok » les yeux fermés, le κ le détecte et reste bas. C'est le garde-fou contre la validation de complaisance.

**Reconnaissance.** Co-crédit d'auteur sur la publication académique et mention nominative dans la carte de dataset. Ce n'est pas du bénévolat anonyme.

---

## 7. Les résultats : le palmarès et sa marge d'erreur

### 7.1 Le classement

Campagne d'amorçage, échantillon de 101 questions, fichier [`data/results/_seed_v0.1.json`](../data/results/).

| Rang | Modèle | Fournisseur | Accuracy | Correct / Total | Incorrect | Sans réponse |
|---:|---|---|---:|---|---:|---:|
| 1 | DeepSeek V4 | DeepSeek | **96,0 %** | 97/101 | 4 | 0 |
| 2 | Claude Sonnet 4 | Anthropic | 95,0 % | 96/101 | 5 | 0 |
| 3 | GPT-4o | OpenAI | 94,1 % | 95/101 | 6 | 0 |
| 4 | Mistral Large | Mistral | 92,1 % | 93/101 | 5 | **3** |
| 5 | GPT-4o Mini | OpenAI | 91,1 % | 92/101 | 9 | 0 |
| 6 | Gemini 2.5 Flash | Google | 90,1 % | 91/101 | 10 | 0 |
| 6 | Claude Haiku 4.5 | Anthropic | 90,1 % | 91/101 | 10 | 0 |

Un huitième modèle, Llama 3.1 70B (Together AI), est configuré mais pas encore évalué.

Moyennes par difficulté sur les sept modèles : facile **93,5 %**, moyen **93,1 %**, difficile **91,5 %**.

### 7.2 Ce que ce tableau dit — et ce qu'il ne dit pas

Voici la partie du rapport qui compte le plus, et celle qu'un support de communication ordinaire supprimerait.

Le rapport statistique [`data/stats/seed_report.json`](../data/stats/), produit par [`scripts/stats_analysis.py`](../scripts/stats_analysis.py), calcule pour chaque modèle un intervalle de confiance à 95 % par bootstrap (2 000 rééchantillonnages). Pour DeepSeek V4 : **96,04 % [92,08 ; 99,01]**.

Les intervalles des deux premiers **se chevauchent largement**. Sur 21 comparaisons appariées par test de McNemar, **2 seulement** ressortent significatives au seuil de 5 % :

- Claude Haiku 4.5 vs Claude Sonnet 4 (p ≈ 0,031)
- DeepSeek V4 vs Gemini 2.5 Flash (p ≈ 0,039)

**Conclusion honnête : sur cet échantillon, DeepSeek V4 n'est pas démontré supérieur à Claude Sonnet 4.** L'écart de 1 point est dans le bruit statistique.

> **En clair.** C'est exactement la logique d'un sondage électoral. « 52 % contre 48 %, marge d'erreur 3 points » ne signifie pas que le premier gagne : cela signifie qu'on ne sait pas. Avec 101 questions, une question de plus ou de moins déplace le score d'un point entier. Notre classement affiche un ordre, mais l'analyse statistique dit que le podium est indécidable. Nous publions les deux.

Le site et le Space Hugging Face affichent cet avertissement plutôt que de le masquer. La fonction de détection d'écart dans `hf_space/utils.py` compare automatiquement la taille du corpus (350) au nombre de questions réellement évaluées (101) et déclenche une bannière si les deux diffèrent.

### 7.3 Le plafond de verre : notre problème le plus intéressant

Sept modèles entre 90 et 96 %. Un examen où tout le monde a plus de 90 % ne classe pas les candidats : il les congratule.

Ce plafonnement — documenté dans [`CRITIQUE.md`](../CRITIQUE.md) § 1.3 — est notre principal enjeu scientifique. Trois causes possibles, non exclusives :

1. **Le corpus est trop facile.** Beaucoup de questions portent sur des faits largement présents sur le web francophone, donc probablement dans les données d'entraînement.
2. **Contamination.** Certaines questions ou leurs sources ont pu être vues à l'entraînement. Un script d'analyse de contamination a été ajouté (PR #25) pour instruire cette hypothèse.
3. **Le format QCM est trop indulgent.** Reconnaître la bonne réponse parmi quatre est beaucoup plus facile que de la produire.

La réponse structurelle est déjà en place dans l'architecture : montée en difficulté, et surtout **basculement vers les tâches ouvertes**, où deviner ne sert à rien. La catégorie `raisonnement_culturel` atteignant 100 % pour certains modèles sur le seed, elle est la première candidate à un durcissement.

### 7.4 Chaîne de publication des scores

```
scripts/afribench.py run
        ↓  data/results/*.json
scripts/export_frontend.py          → frontend/data/{results,questions}.json
scripts/stats_analysis.py           → data/stats/report.json
scripts/generate_static_html.py     → frontend/data/bootstrap.json + HTML pré-rendu
scripts/aggregate_open_scores.py    → frontend/data/open_scores.json
scripts/sync_hf_space_data.py       → hf_space/data/
scripts/deploy_hf_space.sh --push   → Hugging Face Space
```

---

## 8. Architecture logicielle

> **En clair.** Le projet est bâti comme un journal. Il y a la salle de rédaction (les fichiers de données, source de vérité), l'imprimerie (les scripts qui fabriquent les résultats), le kiosque (l'API, qui distribue à la demande), et la vitrine (le site web). Chaque étage peut être remplacé sans casser les autres, et le kiosque continue de servir même si l'imprimerie est à l'arrêt.

### 8.1 Vue d'ensemble

```
┌──────────────────────────────────────────────────────────────┐
│  SOURCE DE VÉRITÉ  —  fichiers versionnés dans Git           │
│  data/questions/ · data/results/ · configs/                  │
└───────────────────────────┬──────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌────────────────┐
│ scripts/      │   │ backend/      │   │ exports        │
│ Moteur éval   │   │ API FastAPI   │   │ HF · lm_eval   │
│ + statistiques│   │ + PostgreSQL  │   │ + Space Gradio │
└───────────────┘   └───────┬───────┘   └────────────────┘
                            │ /api/v1
                            ▼
                    ┌───────────────┐
                    │ frontend/     │
                    │ SPA Vite      │
                    │ + nginx       │
                    └───────────────┘
```

### 8.2 Choix d'architecture et pourquoi

| Décision | Justification |
|---|---|
| **Les fichiers JSON versionnés sont la source de vérité, pas la base de données** | Un corpus scientifique doit être auditable et diffable. Une pull request sur une question montre exactement ce qui change. Une ligne dans une table Postgres, non. |
| **PostgreSQL est optionnel** | Le service démarre et fonctionne sans base. La base ajoute la persistance des jobs, le hub participatif et le rate-limiting distribué — pas la capacité de lire le benchmark. |
| **Frontend en JavaScript natif, sans framework** | Projet pédagogique : on apprend le DOM, les modules ES et le rendu avant d'apprendre React. Bénéfice secondaire : un bundle très léger, ce qui compte sur une connexion mobile africaine. |
| **Un dépôt unique (monorepo)** | Corpus, moteur, API et interface évoluent ensemble. Un changement de schéma de question touche les quatre ; les séparer multiplierait les désynchronisations. |
| **Tout en français** | Public cible. La langue de l'interface, du code de conduite, de la documentation et des messages de commit. |

### 8.3 Volumétrie du code

| Composant | Mesure |
|---|---|
| Python (backend + scripts + tests) | ~7 400 lignes |
| JavaScript applicatif (`frontend/js` + `frontend/src`) | ~3 750 lignes |
| CSS (`frontend/css/style.css`) | 4 469 lignes |
| Endpoints HTTP | 35 |
| Tables PostgreSQL | 7 |
| Migrations Alembic | 4 |
| Scripts CLI | 37 fichiers dans `scripts/` |
| Tests | 61 backend (16 fichiers) + 30+ cas frontend |
| Workflows CI/CD | 7 |

---

## 9. Le backend : le guichet

### 9.1 Rôle

Une API HTTP en FastAPI (Python 3.12) qui expose le benchmark en lecture, pilote les campagnes d'évaluation, et gère le hub de propositions communautaires.

### 9.2 Structure

```
backend/app/
├── main.py          # Application, cycle de vie, CORS, montage des routeurs
├── config.py        # Settings (préfixe AFRIBENCH_), 16 variables
├── db.py            # Engine SQLAlchemy, sessions, exécution des migrations
├── models.py        # 7 tables ORM
├── schemas.py       # Contrats d'entrée/sortie Pydantic v2
├── repository.py    # Accès données, seed versionné, jobs, verrous
├── security.py      # Clé d'API + garde de rate-limit
├── rate_limit.py    # 3 backends : mémoire / PostgreSQL / Redis
├── admin_auth.py    # Sessions administrateur signées HMAC
├── routers/
│   ├── v1.py        # 19 endpoints publics
│   └── admin.py     # 15 endpoints d'administration
└── services/
    ├── data_loader.py  # Lecture JSON + agrégations
    ├── evaluate.py     # Jobs d'évaluation asynchrones
    └── open_tasks.py   # Tâches ouvertes, traductions, statut de validation
```

### 9.3 Les endpoints publics

Préfixe `/api/v1`. Tous soumis au rate-limiting.

| Méthode | Chemin | Auth | Rôle |
|---|---|---|---|
| GET | `/health` | — | Sonde de vie |
| GET | `/results` | — | Résultats d'évaluation (filtres `model`, `category`, `limit`) |
| GET | `/questions` | — | Corpus QCM (filtres `category`, `difficulty`, `limit`) |
| GET | `/models` | — | Scores agrégés par modèle (dernier run) |
| GET | `/models/configured` | — | Modèles disponibles pour évaluation |
| GET | `/stats` | — | Statistiques globales, couverture de validation, traductions, tâches ouvertes |
| GET | `/leaderboard` | — | Classement + moyennes par catégorie |
| GET | `/validation/status` | — | État de la validation externe |
| GET | `/translations` | — | Traductions par langue (`lang` requis) |
| GET | `/translations/manifest` | — | Totaux par langue + drapeau `official` |
| GET | `/open/tasks` | — | Tâches ouvertes |
| GET | `/open/scores` | — | Scores des tâches ouvertes |
| GET | `/proposals` | — | Propositions communautaires (tri `needs_votes`/`popular`/`new`) |
| POST | `/proposals` | — | Soumettre une proposition |
| POST | `/proposals/{id}/vote` | — | Voter (+1 / −1) |
| POST | `/evaluate` | `X-API-Key` | Lancer une évaluation |
| GET | `/jobs/{job_id}` | — | Statut d'un job |
| GET | `/jobs` | — | Jobs récents |
| POST | `/reload` | `X-API-Key` | Invalider le cache et relire le disque |

Quinze endpoints d'administration supplémentaires sous `/api/v1/admin` (CRUD questions, résultats, modèles ; modération des propositions ; lancement d'évaluation), protégés par un jeton porteur.

### 9.4 Le modèle de données

Sept tables, gérées exclusivement par Alembic (aucun `create_all`).

| Table | Rôle | Points notables |
|---|---|---|
| `questions` | Corpus | `seed_version` (versionnement), `locked_by_admin` (verrou humain), `is_control` |
| `question_proposals` | Propositions communautaires | `status` : pending / accepted / rejected |
| `proposal_votes` | Votes | `voter_hash` (SHA-256), unicité `(proposal_id, voter_hash)` |
| `results` | Résultats d'évaluation | `by_category` et `by_difficulty` en JSONB, unicité `(model, timestamp)` |
| `eval_jobs` | Jobs d'évaluation | `status`, `worker_id` (`hostname:pid`), `result_summary` |
| `rate_limit_hits` | Compteurs de débit | Backend PostgreSQL du rate-limiter |
| `models` | Configuration des modèles | `api_key` chiffrée Fernet (préfixe `enc:`) |

**Migrations :**

| Révision | Apport |
|---|---|
| `001_baseline` | `questions`, `results`, `models` |
| `002_durable_jobs` | `eval_jobs`, `rate_limit_hits` |
| `003_seed_version` | `seed_version` + `locked_by_admin` sur `questions` |
| `004_question_proposals` | `question_proposals`, `proposal_votes` |

Les quatre migrations sont **idempotentes** : elles vérifient l'existence de la table ou de la colonne avant d'agir.

> **En clair.** Une migration, c'est un plan de travaux dans une maison habitée : on ajoute une pièce sans déménager les occupants ni jeter les meubles. L'idempotence garantit qu'exécuter deux fois le même plan ne construit pas deux fois la même pièce.

### 9.5 Le repli en cascade : le groupe électrogène

C'est la décision d'architecture la plus caractéristique du projet.

```
get_questions() / get_results()
   │
   ├── Base de données activée ?
   │     ├── OUI → lecture PostgreSQL
   │     │          └── exception → repli silencieux sur les fichiers
   │     └── NON → lecture des fichiers JSON (cache LRU)
   │
   └── Frontend : API → bootstrap.json → data/*.json → message d'erreur explicite
```

Quatre niveaux de dégradation :

1. Sans PostgreSQL, le backend lit les fichiers JSON du dépôt.
2. Avec PostgreSQL indisponible en cours de route, il retombe sur les fichiers sans planter.
3. Si l'initialisation de la base échoue au démarrage, l'exception est journalisée et **le service démarre quand même**.
4. Si la base est absente, les jobs d'évaluation sont stockés dans un dictionnaire en mémoire protégé par verrou.

Le hub participatif est la seule fonctionnalité qui exige PostgreSQL, et il renvoie un `503` explicite plutôt qu'une erreur obscure.

> **En clair.** Nous avons conçu ce système en sachant que l'électricité et le réseau ne sont pas des acquis partout où nous vivons. Le site est un commerce avec groupe électrogène : quand le courant saute, la lumière baisse mais on continue de servir, et un panneau annonce honnêtement « nous sommes sur groupe ». Le badge de source de données dans la barre latérale dit exactement cela : « API en direct », « Données statiques », « Aperçu pré-généré » ou « Indisponible ».

### 9.6 Le système de jobs d'évaluation

Lancer une évaluation prend plusieurs minutes : impossible de faire attendre une requête HTTP. Le système fonctionne donc par jobs.

```
POST /evaluate → job créé (status: queued)
                   ├── sync=true  → exécution bloquante (limite ≤ 20 questions)
                   └── sync=false → thread démon
                                     ├── acquisition d'un verrou exclusif
                                     ├── status: running, worker_id renseigné
                                     └── completed | failed
```

| Mécanisme | Implémentation |
|---|---|
| Statuts | `queued` → `running` → `completed` \| `failed` |
| Exclusion mutuelle | `pg_try_advisory_lock(42424242)` en multi-réplica, `threading.Lock` sinon |
| Reprise après redémarrage | Jobs `running` orphelins marqués `failed` ; jobs `queued` relancés |
| Suivi | `GET /jobs/{id}` ; le backoffice interroge toutes les 3 s |

> **En clair.** Le verrou exclusif est le jeton unique de la salle des machines : une seule évaluation à la fois, pour ne pas saturer les API des fournisseurs ni gaspiller le budget d'inférence. Et si le serveur redémarre au milieu d'une campagne, le système ne prétend pas qu'elle est toujours en cours : il déclare l'échec et repropose le travail.

### 9.7 Sécurité

| Surface | Mesure |
|---|---|
| Écriture (`/evaluate`, `/reload`) | En-tête `X-API-Key`, comparaison à temps constant (`secrets.compare_digest`) |
| Administration | Mot de passe → jeton HMAC-SHA256 signé, TTL 12 h par défaut |
| Débit | Fenêtre glissante par `IP:chemin` — 120 lectures/min, 10 écritures/min ; réponse `429` + `Retry-After` |
| Backends de rate-limit | Résolution automatique : Redis → PostgreSQL → mémoire |
| Injection SQL | ORM SQLAlchemy, requêtes paramétrées |
| XSS | API strictement JSON côté serveur ; échappement systématique côté client |
| Secrets | Clés d'API des modèles chiffrées Fernet en base |
| Vie privée | Identifiants de votants hachés en SHA-256, jamais stockés en clair |
| CORS | Ouvert en prototype, restrictible par `AFRIBENCH_CORS_ORIGINS` |

Une fonctionnalité dont le secret n'est pas configuré renvoie **`503`, pas `401`** : le service dit « cette porte n'existe pas ici » au lieu de « mauvais mot de passe », ce qui ne renseigne pas un attaquant sur la présence d'une porte.

### 9.8 Dépendances

Treize dépendances directes : `fastapi`, `uvicorn[standard]`, `pydantic`, `pydantic-settings`, `pyyaml`, `requests`, `httpx`, `sqlalchemy`, `psycopg[binary]`, `cryptography`, `redis`, `alembic`, `pytest`.

Ni Celery, ni RQ, ni framework d'authentification tiers. La complexité opérationnelle a été volontairement contenue : chaque dépendance supplémentaire est une chose de plus à comprendre pour un contributeur débutant.

---

## 10. Le frontend : la salle d'exposition

### 10.1 Choix technique

Une application monopage en **JavaScript natif** (modules ES), bundlée par **Vite**, servie par **nginx**. Pas de React, pas de Vue, pas de Svelte.

Trois raisons :
1. **Pédagogie.** Le projet doit enseigner le web, pas un framework.
2. **Poids.** Bundle minimal, ce qui compte sur une connexion mobile facturée au mégaoctet.
3. **Durabilité.** Du JavaScript natif de 2026 fonctionnera encore en 2032.

### 10.2 Chaîne de construction

```
index.html
  └── src/main.js
        ├── Chart.js (graphiques)
        ├── @fontsource/sora  (400–800)   ← titres
        ├── @fontsource/inter (400–600)   ← corps de texte
        ├── css/style.css
        ├── src/icons.js  (Lucide, ~20 icônes en tree-shaking)
        └── js/*.js  (noyau applicatif + 9 vues)
```

| Script npm | Action |
|---|---|
| `npm run dev` | Serveur Vite port 3000, proxy `/api` → `127.0.0.1:8080` |
| `npm run build` | Build Vite + copie des assets statiques |
| `npm run lint` | ESLint 9 (flat config) |
| `npm test` | Vitest + jsdom |

Le `Dockerfile` du frontend est multi-étages : `node:20-alpine` pour construire, `nginx:1.27-alpine` pour servir.

### 10.3 Une astuce de robustesse qui mérite d'être signalée

nginx résout normalement le nom DNS de son backend **au démarrage**. Si le backend n'est pas encore joignable, nginx refuse de démarrer — le frontend tombe parce que l'API n'est pas prête.

Le script [`frontend/docker-entrypoint.d/15-backend-resolver.sh`](../frontend/docker-entrypoint.d/) lit `/etc/resolv.conf` au boot et génère une directive `resolver` dynamique. Le proxy passe alors par une variable nginx, ce qui **diffère la résolution DNS au moment de la requête**.

> **En clair.** La vitrine ouvre à l'heure même si le fournisseur est en retard. Quand il arrive, elle le trouve toute seule, sans qu'on ait à rouvrir le magasin. Ce détail de trois lignes de shell a résolu une classe entière de pannes de déploiement (PR #35–#36).

### 10.4 Navigation à deux niveaux

Quatre espaces stables dans la barre latérale, chacun avec ses sous-onglets :

| Espace | Sous-onglets |
|---|---|
| **Vue d'ensemble** | Classement · Modèles |
| **Analyse** | Comparer · Évolution |
| **Données** | Questions · Tâches ouvertes |
| **Projet** | Méthodologie · Participer · API |

Plus deux accès directs : « Participer » (pied de la barre latérale) et « Backoffice ».

L'état de navigation est **encodé dans l'URL** (`?tab=…&category=…&difficulty=…&page=…`) et synchronisé via `history.replaceState` et `popstate`. Un filtre appliqué est donc partageable par lien et le bouton retour du navigateur fonctionne.

### 10.5 Les dix vues

| Vue | Ce qu'elle montre |
|---|---|
| **Classement** | Tableau triable des modèles : rang, score avec barre de progression, décompte correct/total, scores par difficulté, meilleure catégorie, écart-type coloré, date. Favoris, export CSV/JSON, légende des métriques dépliable, deux graphiques (par catégorie, par difficulté). |
| **Modèles** | Grille de fiches, une par modèle : score, fournisseur, badge « ouvert / propriétaire », mini-radar par catégorie, bouton « Comparer » qui préremplit la vue Comparer. |
| **Comparer** | Sélection multiple de modèles → radar superposé + tableau détaillé catégorie × modèle. Les trois premiers sont présélectionnés. |
| **Évolution** | Courbes des scores dans le temps, tableau premier score / score actuel / delta coloré / nombre d'évaluations. |
| **Questions** | Explorateur du corpus, 20 questions par page, filtres par catégorie et difficulté, recherche plein texte, dépliage question par question (options, réponse, explication, source), pagination accessible. |
| **Tâches ouvertes** | Scores des tâches non-QCM, badge « dry-run » si applicable, encart pipeline avec les commandes exactes. |
| **Participer** | Le hub participatif (§ 12). |
| **Méthodologie** | Le protocole en clair : conception, catégories, évaluation, métriques, reproductibilité, limites. Fonctionne sans API. |
| **API** | Documentation des endpoints avec exemples curl, Python et JavaScript. |
| **Question du jour** | Carte permanente : une question tirée de façon déterministe (graine = date du jour), dépliable, avec bouton « Voir la réponse ». |

La « Question du jour » n'est pas un gadget : c'est le dispositif qui transforme un tableau de bord technique en objet de curiosité quotidienne, et le point d'entrée le plus efficace vers le corpus pour un visiteur non technique.

### 10.6 Chargement des données en cascade

```
1. bootstrap.json        → premier affichage instantané, sans attendre l'API
2. API (en parallèle)    → GET /results?limit=1000 · /questions?limit=500 · /stats
3. Repli statique        → frontend/data/results.json · questions.json
4. Échec total           → carte « Données indisponibles » + bouton Réessayer
```

L'origine réelle des données est affichée en permanence dans la barre latérale (`dataSource` : `api` / `bootstrap` / `static` / `none`). Le visiteur sait toujours s'il regarde du direct ou une photographie.

### 10.7 Référencement et accès sans JavaScript

Un benchmark scientifique doit être trouvable et citable. Trois dispositifs :

- **HTML pré-généré.** [`scripts/generate_static_html.py`](../scripts/) injecte le classement directement dans `index.html`, entre des marqueurs `<!-- STATIC_LEADERBOARD_BEGIN/END -->`. Un moteur de recherche voit les données sans exécuter de JavaScript.
- **`<noscript>` enrichi** avec le top 7 des modèles.
- **Métadonnées structurées** : Open Graph, URL canonique, JSON-LD de type `Dataset`, balises de citation académique, `sitemap.xml`, `robots.txt`.

---

## 11. Interface et expérience utilisateur

### 11.1 La charte Y'TILIKAN, traduite en tokens CSS

| Rôle | Clair | Sombre |
|---|---|---|
| Fond de page (ivoire) | `#FAF9F6` | `#12100E` |
| Texte principal | `#0A0806` | `#F4F2EE` |
| **Accent (orange Y'TILIKAN)** | `#FFA726` | `#FFA726` |
| Surfaces | `#FFFFFF` · `#F2EFEA` | `#1C1A17` · `#26231F` |
| Bordures | `#E6E2DC` | `#37332D` |
| Texte atténué | `#5B5854` | `#A39E96` |
| Barre latérale | `#0A0806` | `#0A0806` |

Typographie : **Sora** pour les titres (jusqu'à 800), **Inter** pour le corps, petites capitales espacées pour les libellés techniques. Le fond porte un motif de points très discret (dégradé radial 20 × 20 px).

Parti pris esthétique : **la bordure plutôt que l'ombre**. Pas de cartes flottantes ni de dégradés décoratifs. Une densité de tableau de bord éditorial, où la donnée occupe l'espace et le décor s'efface.

### 11.2 Accessibilité

Ce chantier n'était pas cosmétique : la version de juin échouait sur presque tous les critères, comme le documente [`CRITIQUE.md`](../CRITIQUE.md) partie 2.

| Critère | Implémentation |
|---|---|
| Lien d'évitement | « Aller au contenu principal » → `#tab-content` |
| Repères sémantiques | `role="navigation"`, `role="tablist"`, `role="tabpanel"`, `aria-label` |
| Onglets au clavier | `aria-selected`, `aria-controls`, `tabindex` glissant, flèches ↑↓, Début/Fin |
| Modales | `role="dialog"`, `aria-modal`, **piège de focus** sur Tab, fermeture par Échap et clic hors cadre, **restitution du focus** à l'élément déclencheur |
| Pagination | `aria-label`, `aria-current="page"`, boutons désactivés explicitement |
| Focus visible | Contour orange 2 px sur tous les éléments interactifs |
| Mouvement réduit | `@media (prefers-reduced-motion: reduce)` désactive transitions et animations d'apparition |
| Injection HTML | `escapeHtml()` systématique dans tous les rendus dynamiques, avec test de non-régression XSS |

> **En clair.** Une interface accessible, ce n'est pas une faveur faite à une minorité. C'est une interface qui fonctionne au clavier quand la souris est cassée, lisible en plein soleil, utilisable par un lecteur d'écran, et qui ne fait pas vibrer l'écran de quelqu'un qui souffre de migraines. C'est de la qualité de fabrication.

### 11.3 Le mobile, traité comme cas principal

En Afrique francophone, le premier — et souvent l'unique — écran est un téléphone. Cinq seuils de rupture :

| Seuil | Comportement |
|---|---|
| ≤ 1020 px | Barre latérale réduite à 220 px, statistiques d'en-tête en 2 × 2 |
| ≤ 900 px | Graphiques sur une colonne, filtres qui passent à la ligne |
| ≤ 768 px | **Menu hamburger**, barre latérale en tiroir off-canvas de 280 px avec fond assombri |
| ≤ 600 px | Hero vertical, navigation secondaire en défilement horizontal, filtres pleine largeur |
| ≤ 520 px | Pagination en icônes seules, titre d'en-tête réduit à 32 px |

Le tableau du classement mérite une mention particulière. La solution paresseuse est le défilement horizontal — que personne ne découvre sur mobile. À la place, une **container query** masque progressivement les colonnes par ordre inverse d'importance : d'abord l'écart-type et la date, puis les scores par difficulté, puis la meilleure catégorie, puis la barre de score, puis le décompte de questions. **Aucun défilement horizontal, à aucune largeur.** L'information la plus importante — rang, modèle, score — reste toujours visible.

### 11.4 États d'interface

| État | Traitement |
|---|---|
| Chargement | Classe `body.is-loading`, opacité réduite des statistiques |
| Vide | `.empty-state` contextualisée par vue, avec appel à l'action |
| Erreur de données | Carte « Données indisponibles » + bouton Réessayer |
| Source de données | Badge permanent en barre latérale (4 états) |
| Confirmations | Toasts (2,5 s, coin bas-droit) dans le backoffice |

### 11.5 Autres soins d'usage

- **Recherche globale** avec `Ctrl+K`, debounce 200 ms, bascule automatique vers une vue cherchable si la vue courante ne l'est pas.
- **Favoris** persistés en `localStorage` (`afribench-favs`), étoile cliquable sur chaque modèle.
- **Thème sombre** persisté (`afribench-theme`), initialisé sur `prefers-color-scheme`, avec re-rendu des graphiques Chart.js qui relisent les variables CSS.
- **Apparition au défilement** via `IntersectionObserver`, neutralisée si `prefers-reduced-motion`.
- **Palette de graphiques** à 6 couleurs distinctes **plus des motifs de trait différenciés**, pour rester lisible en cas de daltonisme ou d'impression en noir et blanc.

### 11.6 Visualisations

| Vue | Type | Contenu |
|---|---|---|
| Classement | Barres groupées | Accuracy par catégorie, 6 meilleurs modèles |
| Classement | Barres groupées | Facile / Moyen / Difficile |
| Modèles | Mini-radar | Profil par catégorie, une par fiche |
| Comparer | Radar | Modèles sélectionnés × catégories |
| Évolution | Courbes | Scores dans le temps, `spanGaps` activé |

Un utilitaire `mountChart()` détruit systématiquement l'instance Chart.js précédente avant d'en créer une nouvelle — protection contre les fuites mémoire lors des changements d'onglet répétés.

### 11.7 Le backoffice

Fichier autonome [`frontend/admin/index.html`](../frontend/admin/), thème sombre permanent, `noindex,nofollow`.

| Écran | Fonction |
|---|---|
| Connexion | Mot de passe → jeton stocké en `localStorage` |
| Questions | CRUD complet, modale d'édition avec les options A–D et le marqueur témoin |
| Résultats | Consultation et édition des scores publiés |
| Modèles | Configuration des fournisseurs, identifiants de modèle, clés d'API |
| Évaluation | Formulaire (modèle, catégorie, few-shot, limite) → lancement de job → suivi par sondage toutes les 3 s |

> **En clair.** Le backoffice évite d'avoir à ouvrir un terminal pour corriger une faute de frappe dans une question. C'est ce qui rend le projet transmissible : un membre non développeur de l'équipe peut contribuer au corpus.

---

## 12. Le hub participatif : l'arbre à palabres numérique

> **En clair.** Dans beaucoup de sociétés africaines, une décision collective se prend sous l'arbre à palabres : chacun parle, le groupe tranche. Le hub des questions est cet arbre, en version numérique. N'importe qui propose une question. La communauté vote. Ce ne sont pas les fondateurs du projet qui décident seuls de ce qui mérite d'être demandé à une IA au sujet de l'Afrique.

### 12.1 Le parcours

1. Accès par la barre latérale (« Participer »), l'espace Projet, ou le bouton « Proposer » dans la vue Questions.
2. Parcours des propositions, triées par défaut sur **« À départager »** — celles qui ont le moins de votes remontent en premier.
3. Vote ↑ / ↓, modifiable et révocable. Score = votes positifs − votes négatifs.
4. Examen du détail avant de voter : options, bonne réponse mise en évidence, explication, source.
5. Soumission d'une nouvelle question via une modale : catégorie, difficulté, énoncé, quatre options, réponse correcte, explication, source, et auteur (optionnel).
6. Modération par le backoffice : `pending` → `accepted` / `rejected`.

Le tri par défaut est un choix de conception, pas un défaut. Trier par popularité fabrique un effet Matthieu : les propositions déjà vues attirent tous les votes, les nouvelles ne sont jamais examinées. En faisant remonter les moins votées, on répartit l'attention.

### 12.2 Validation et vie privée

Validation côté client : énoncé et explication de 20 caractères minimum, quatre options distinctes, source de 8 caractères minimum.
Validation côté serveur : schéma Pydantic strict — les options doivent être exactement `{A, B, C, D}`, chacune entre 1 et 500 caractères, énoncé entre 20 et 1 000 caractères.

L'identité du votant est un UUID généré localement et conservé en `localStorage`. Le serveur ne stocke que son **hachage SHA-256**. Une contrainte d'unicité `(proposal_id, voter_hash)` empêche le vote multiple, sans que le serveur puisse jamais remonter à un individu.

### 12.3 Mode dégradé

Si l'API est indisponible, le hub **continue de fonctionner en local** : propositions et votes sont stockés en `localStorage` (`afribench-local-proposals`), avec un bandeau honnête expliquant que ces contributions sont locales tant que la base n'est pas connectée. Le visiteur n'est jamais devant une page morte, et ne croit jamais avoir contribué au dépôt public alors que non.

### 12.4 Les autres voies de contribution

Le hub complète, sans remplacer, les voies plus classiques documentées dans [`CONTRIBUTING.md`](../CONTRIBUTING.md) :

- **Formulaire d'issue GitHub structuré** (`.github/ISSUE_TEMPLATE/proposition-question.yml`) pour proposer une question sans savoir coder.
- **Pull request** directe sur les fichiers JSON du corpus.
- **Validation** de questions existantes (kit validateurs).
- **Traduction** vers les langues africaines.
- **Ajout de modèles** dans `configs/models.yaml`.
- **Contribution frontend / API.**

---

## 13. Qualité, tests et intégration continue

### 13.1 Tests backend

**61 tests** répartis sur **16 fichiers** (`cd backend && PYTHONPATH=. pytest -q`).

| Fichier | Portée |
|---|---|
| `test_api.py` | Endpoints publics, filtres, agrégations |
| `test_evaluate_auth.py` | Clé d'API (503/401), mise en file, rate-limit 429 |
| `test_proposals_api.py` | Hub : liste, validation des options, anonymat des votes |
| `test_durable_jobs.py` | Jobs en base et en mémoire, trois backends de rate-limit, verrou exclusif |
| `test_phase3_api.py` | Validation, traductions, tâches ouvertes, statistiques étendues |
| `test_phase3_readiness.py` | Scripts de validation et de traduction, métriques texte, documentation |
| `test_seed_version.py` | Versionnement du corpus, upsert, verrou administrateur |
| `test_consistency.py` | **Cohérence entre le corpus, l'export frontend et le manifeste lm_eval** |
| `test_open_and_i18n.py` | Schémas ouverts, traductions, juge en dry-run |
| `test_validation_scripts.py` | Statut de validation, κ de Cohen, lots de traduction |
| `test_stats_and_open_eval.py` | Bootstrap sur le seed, détection d'écart de statistiques |
| `test_exports.py` | Décomptes témoin/africain, export Hugging Face |
| `test_mock_eval.py` | Déterminisme du mode simulé |
| `test_lm_eval_utils.py` | Dataset lm_eval, helpers, YAML de catégories |
| `test_hf_space_utils.py` | Utilitaires du leaderboard Gradio |

`test_consistency.py` mérite d'être souligné : il vérifie que le corpus, ce que voit le site et ce que voit LM Evaluation Harness racontent la même histoire. C'est le test qui empêche la dérive silencieuse entre les vitrines d'un projet à plusieurs sorties.

### 13.2 Tests frontend

[`frontend/tests/views.test.js`](../frontend/tests/) — plus de 30 cas sous Vitest + jsdom :

- Fonctions pures : `escapeHtml`, `getLatestResults`, `isOpenModel`.
- Rendu sans plantage des 8 vues montées.
- **Non-régression XSS** : une question contenant `<img onerror=…>` ne doit pas produire de balise `<img>` dans le DOM.
- Pagination (20 par page), filtres par catégorie, dépliage.
- Navigation ARIA, espaces de travail, synchronisation des filtres avec l'URL.
- Hub : ouverture/fermeture de modale, Échap, validation de formulaire, soumission simulée.

### 13.3 Les sept workflows

| Workflow | Déclencheur | Contenu |
|---|---|---|
| `ci.yml` | push / PR sur `main` | pytest backend · `validation_status.py` · dry-run des tâches ouvertes · `submission_readiness.py` · ESLint · Vitest · build Vite |
| `deploy-pages.yml` | push `main`, manuel | Export frontend, tâches ouvertes, sync HF, HTML statique, build Vite, publication sur `gh-pages` |
| `docker-services.yml` | changement des Dockerfiles | Build matriciel backend + frontend, **test fumée du frontend sans backend** |
| `docker-eval.yml` | changement du Dockerfile racine, `scripts/`, `data/` | Build `afribench:eval`, fumée `validate` + `list-models` |
| `hf-space.yml` | changement de `hf_space/` | Synchronisation des données, import de `create_app()` |
| `close-issues.yml` | manuel | Clôture d'issues résolues avec commentaire de traçabilité |
| `static.yml` | désactivé | Ancien déploiement Pages, conservé pour l'historique |

Deux détails qui traduisent la philosophie du projet :

- La CI n'exécute pas seulement des tests unitaires : elle lance `validation_status.py` et `submission_readiness.py`. **Le niveau de complétude scientifique du projet est vérifié à chaque commit**, au même titre que le code.
- `docker-services.yml` vérifie explicitement que **le frontend démarre alors que le backend est absent**. La résilience n'est pas une intention, c'est un test.

---

## 14. Déploiement et exploitation

### 14.1 Trois cibles, un seul dépôt

```
                 fichiers de données · code · configs
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
  GitHub Pages            Railway                Hugging Face
  (statique)           (2 services)          (Space + Dataset)
  Vitrine, SEO,       API + site live,       Leaderboard Gradio,
  toujours en ligne   base PostgreSQL        dataset citable
```

### 14.2 Développement local — Docker Compose

| Service | Image | Port | Rôle |
|---|---|---|---|
| `postgres` | `postgres:16-alpine` | 5432 | Persistance |
| `backend` | `backend/Dockerfile` | 8080 | API FastAPI + healthcheck |
| `frontend` | `frontend/Dockerfile` | 3000 → 8080 | SPA nginx + proxy `/api` |
| `eval` (profil) | `Dockerfile` racine | — | Évaluation reproductible |

```bash
docker compose up --build
# Site : http://localhost:3000
# API  : http://localhost:8080/api/v1
# Docs : http://localhost:8080/docs
```

### 14.3 Production — Railway

Deux services issus du même monorepo, documentés dans [`docs/deploiement-railway.md`](deploiement-railway.md).

| Service | Dockerfile | Configuration | Exposition |
|---|---|---|---|
| `afribench-api` | `backend/Dockerfile` | `railway.backend.toml` | Réseau privé |
| `afribench-frontend` | `frontend/Dockerfile` | `railway.frontend.toml` | Public |

Le frontend joint l'API par le réseau interne : `BACKEND_URL=http://afribench-api.railway.internal:8080`. L'API n'est donc pas exposée directement.

Les sondes de santé sont **internes au conteneur** (`HEALTHCHECK` Docker sur `/api/v1/health`) plutôt que déclarées côté plateforme. Ce choix, arrêté après les incidents traités en PR #35–#36, évite qu'un service soit tué par un contrôle de santé de plateforme avant d'avoir fini son démarrage — notamment le temps d'exécuter les migrations Alembic.

### 14.4 Diffusion statique — GitHub Pages

Publiée à chaque push sur `main`, branche `gh-pages`, à l'adresse **[ytilikan.github.io/AfriBench](https://ytilikan.github.io/AfriBench/)**.

Cette copie n'a pas d'API : elle sert le classement pré-généré dans le HTML et les fichiers JSON exportés. C'est le socle qui garantit que le benchmark reste consultable et citable quoi qu'il arrive à l'infrastructure dynamique.

### 14.5 Écosystème Hugging Face

| Artefact | Contenu | Publication |
|---|---|---|
| **Dataset** `YTILIKAN/AfriBench` | `african.jsonl` (350) + `control.jsonl` (20), carte de dataset générée | Export local prêt, push manuel |
| **Space** `YTILIKAN/AfriBench-Leaderboard` | Application Gradio, 5 onglets, heatmap Plotly | `./scripts/deploy_hf_space.sh --push` |

Le Space Gradio reprend le classement, la matrice par catégorie avec carte de chaleur, les tâches ouvertes, le rapport statistique et une page « À propos ». Il embarque la même détection d'écart seed/corpus que le site, et affiche la même bannière d'avertissement.

Le stub `hf_evaluator/` est volontairement documentaire : il pointe vers la CLI et le workflow GitHub au lieu d'exposer un service d'évaluation, ce qui éviterait de donner un accès non contrôlé à des clés d'API payantes.

---

## 15. Diffusion scientifique et ouverture

### 15.1 Citabilité

[`CITATION.cff`](../CITATION.cff) rend le projet citable automatiquement par GitHub, Zotero et les gestionnaires de références.

```yaml
title: "AfriBench: Evaluating Language Models on African Realities"
version: 0.1.0
date-released: 2026-08-20
license: MIT
url: https://ytilikan.github.io/AfriBench/
repository: https://github.com/YTILIKAN/AfriBench
```

Le site expose également un JSON-LD de type `Dataset` et des balises de citation académique dans `index.html`.

### 15.2 Préparation à la publication

[`research/08-soumission-academique.md`](../research/08-soumission-academique.md) tient la checklist pour une soumission au *datasets track* d'ACL, NeurIPS ou EMNLP 2027. État au 24 août 2026 :

| Critère | État |
|---|---|
| 350 questions | ✅ |
| Intégration LM Eval Harness | ✅ |
| Code du Space public | ✅ |
| Carte de dataset | ✅ |
| Analyse statistique (IC, McNemar) | ✅ |
| Validation externe | ❌ **bloquant** |
| Multilingue | 🟡 amorcé |
| Modèles évalués sur le corpus complet | 🟡 seed uniquement |

Le brouillon d'article ([`research/paper-draft.md`](../research/paper-draft.md)) est structuré en 10 sections avec un tableau d'artefacts. Il attend la validation externe et le re-run sur 350 questions.

### 15.3 Documentation de recherche

Le dossier `research/` contient dix documents produits pendant la phase de cadrage :

| Document | Objet |
|---|---|
| `01-finalite.md` | Finalité et principes (reproductible, contextualisé, évolutif) |
| `02-objectifs.md` | Les six objectifs opérationnels |
| `03-phases.md` | Plan en 12 semaines |
| `04-frameworks.md` | Étude comparative de 10 frameworks d'évaluation |
| `05-stack.md` | Choix de la pile technique |
| `06-livrables.md` | Livrables, risques, indicateurs de succès |
| `07-equipe.md` | Rôles et responsabilités |
| `08-soumission-academique.md` | Checklist de publication |
| `paper-draft.md` | Brouillon d'article |
| `afribench-research.html` | Synthèse visuelle imprimable des sept premières notes |

Ces documents ont été écrits **avant** le code. Le choix de LM Evaluation Harness, par exemple, résulte d'une comparaison documentée de dix outils (`04-frameworks.md`), pas d'une préférence.

---

## 16. Gouvernance, éthique et conformité

### 16.1 Licence et ouverture

MIT sur le code. Le corpus est déclaré `other` dans la carte de dataset, le temps de finaliser une licence qui protège l'attribution des contributeurs et validateurs.

### 16.2 Traitement des personnes

[`docs/ANNOTATOR_CONSENT.md`](ANNOTATOR_CONSENT.md) formalise le consentement des validateurs et traducteurs : objectif du projet, charge de travail estimée (2 à 4 h par lot de 30 à 50 items), conditions de rémunération selon accord, absence de données personnelles dans le corpus public, et **droit de retrait avant la sortie v1.0**.

### 16.3 Éthique du contenu

Trois garde-fous inscrits dans le protocole :

1. **Neutralité.** La grille de validation rejette explicitement les questions véhiculant un stéréotype.
2. **Anti-essentialisation.** Le risque porté par la catégorie « Raisonnement culturel » — traiter « la » culture africaine comme un bloc homogène — est nommé dans `CRITIQUE.md` § 1.8, avec un exemple concret de question problématique (`CULT-004`). Sa résolution est explicitement conditionnée à la validation par des experts régionaux.
3. **Non-officialité des brouillons.** Les traductions automatiques non relues sont marquées `draft_mt_unverified` et exclues du classement officiel par le code lui-même, pas seulement par une note de bas de page.

### 16.4 Vie privée

Aucun compte utilisateur, aucun traceur analytique, aucun cookie de suivi. Les préférences (thème, favoris, identifiant de votant) restent dans le `localStorage` du navigateur. Les identifiants de votants sont hachés côté serveur en SHA-256.

### 16.5 Positionnement vis-à-vis des travaux existants

La proximité de nom avec **AfroBench** (McGill-NLP, EMNLP 2024) est documentée dans `CRITIQUE.md` § 1.7 avec la différenciation de positionnement (QCM francophone de connaissance factuelle vs. NLP multilingue). Un renommage reste une option ouverte si la confusion nuit à l'un ou l'autre projet.

---

## 17. Conduite du projet

### 17.1 Le chantier en chiffres

| Indicateur | Valeur |
|---|---|
| Commits (toutes branches) | **151** — 111 de contenu, 31 de fusion |
| Pull requests fusionnées | **28** (#19 à #46, #18 fermée sans fusion) |
| Issues ouvertes puis fermées | **17** (100 % traitées) |
| Contributeurs | Christian Parfait (75 commits), Cursor Agent (65), cursor[bot] (2) |
| Durée | 19 mai → 23 août 2026 |
| Concentration | Août : 102 commits, soit **67 %** de l'activité totale |
| Pic journalier | **45 commits** le 20 août 2026 |

### 17.2 Chronologie

**19 mai — Amorçage.** Commit initial.

**Juin (31 commits) — Fondations.** Notes de recherche, choix du nom AfriBench, structure du dépôt, gabarit JSON de question, écriture du moteur `afribench.py`, premières 101 questions, premier frontend, première évaluation (GPT-4o Mini à 91,1 %), CI GitHub Pages, campagne sur 7 modèles. Puis, dans le même mois, **`CRITIQUE.md`** : l'équipe s'arrête et documente publiquement les faiblesses de ce qu'elle vient de construire.

**Juillet (8 commits) — Identité.** Application de la charte Y'TILIKAN, refonte de la navigation latérale, mise à niveau des modèles évalués.

**Août (102 commits) — Industrialisation.** En quatre vagues :
- *2–3 août* — Séparation frontend/backend, API FastAPI, endpoint `POST /evaluate`, passage de 101 à 350 questions, menu hamburger mobile, `reproduce.sh`, Space Gradio, préparation Phase 3 (PR #19–#24).
- *9 août* — LLM-as-judge et script d'analyse de contamination (PR #25).
- *19–20 août* — Migrations Alembic, jobs et rate-limiting durables, passage à Vite, livraison des issues #5 à #16, corrections de déploiement Railway (PR #26–#36).
- *21–23 août* — Refonte du tableau de bord, hub de questions participatif, iconographie Lucide, finitions mobiles et contrastes (PR #37–#46).

### 17.3 Les 17 issues, comme cahier des charges

Les issues n'ont pas été un fourre-tout : elles constituent la trace du raisonnement du projet. Elles se répartissent en quatre familles :

| Famille | Issues |
|---|---|
| **Honnêteté et lisibilité** | #2 (« LEADER » → « Meilleur score »), #7 (publier le protocole), #8 (lier le script d'évaluation) |
| **Solidité scientifique** | #3 (300–350 questions), #4 (questions témoins), #5 (validateurs africains), #6 (génération ouverte + juge), #14 (multilingue), #15 (tâches non-QCM) |
| **Reproductibilité** | #9 (`reproduce.sh`), #10 (dataset HF), #12 (LM Eval Harness), #13 (Dockerfile) |
| **Diffusion et accès** | #1 (hamburger mobile), #11 (Space Gradio), #16 (soumission académique), #17 (HTML pré-généré + SEO) |

Toutes sont fermées.

### 17.4 Méthode de travail

Le projet a été mené par un binôme humain assisté d'un agent de codage, en cycles courts : une issue, une branche, une pull request, une revue, une fusion. Les 28 pull requests fusionnées portent chacune un thème identifiable, ce qui rend l'historique lisible — un lecteur peut reconstituer le raisonnement du projet à partir des seuls titres de PR.

Ce mode de travail est en soi un livrable pédagogique : il montre qu'une petite équipe africaine peut, avec des outils accessibles, produire en un été un artefact de qualité comparable aux standards de la recherche appliquée.

---

## 18. Limites connues

Cette section n'est pas un aveu arraché : c'est un composant du livrable. La crédibilité d'un instrument de mesure se juge autant sur ce qu'il refuse d'affirmer que sur ce qu'il affirme.

| # | Limite | Gravité | Où c'est visible | Résolution |
|---|---|---|---|---|
| 1 | **Validation externe à 0 %.** Toutes les questions ont été rédigées en interne. `validated_by` est vide sur les 350. | **Élevée** | `GET /api/v1/validation/status`, vue Méthodologie, `CRITIQUE.md` § 1.5 | Recruter 3 validateurs. Pipeline, protocole et documents de consentement prêts. |
| 2 | **Les scores publics portent sur 101 questions, pas 350.** Le corpus a triplé après la campagne. | **Élevée** | Bannière automatique sur le site et le Space, `README.md` | Rejouer les 7+ modèles sur les 350 questions. |
| 3 | **Plafonnement à 90–96 %.** Faible pouvoir discriminant entre modèles. | Moyenne | `CRITIQUE.md` § 1.3, rapport statistique | Durcir le corpus, basculer vers les tâches ouvertes, instruire la contamination. |
| 4 | **Français uniquement pour les scores officiels.** | Structurelle | `translations/manifest` renvoie `official: false` | Traduction native ≥ 50 items par langue (sw/yo/am). |
| 5 | **Tâches ouvertes en dry-run.** Les scores de 1,0 comparent la référence à elle-même. | Moyenne | Badge « dry-run » dans l'interface | Exécuter le juge sur de vraies réponses de modèles. |
| 6 | **Puissance statistique faible.** 101 questions → ±4 points d'intervalle de confiance ; 2 comparaisons significatives sur 21. | Moyenne | `data/stats/seed_report.json` | Le passage à 350 questions réduit mécaniquement l'intervalle. |
| 7 | **Risque d'essentialisation culturelle** dans la catégorie `raisonnement_culturel`. | Éthique | `CRITIQUE.md` § 1.8 | Revue par des experts régionaux ; réécriture des items signalés. |
| 8 | **Collision de nom avec AfroBench** (McGill-NLP). | Faible | `CRITIQUE.md` § 1.7 | Différenciation documentée ; renommage possible. |
| 9 | **Endpoints d'administration non couverts par les tests.** | Faible | `backend/tests/` | Ajouter des tests de connexion et de CRUD administrateur. |
| 10 | **Manifeste incohérent** : annonce 300 QCM, le corpus en contient 350. | Cosmétique | `data/questions/v1/manifest.json` | Correction d'une ligne. |
| 11 | **Pas de métriques d'exploitation** (Prometheus, tracing, logs structurés). | Faible | — | Hors périmètre v0.1 ; à instrumenter si le trafic croît. |
| 12 | **CORS ouvert à `*`** en configuration prototype. | Faible | `backend/app/main.py` | Restreindre via `AFRIBENCH_CORS_ORIGINS` en production. |

---

## 19. Feuille de route

### 19.1 Ce qui est terminé

Les quatre phases prévues dans [`ROADMAP.md`](../ROADMAP.md) sont livrées :

| Phase | Contenu | État |
|---|---|---|
| **1** — Corrections critiques | Bannière prototype, échappement XSS, hamburger mobile, contraste, polices | ✅ |
| **1.5** — Service | FastAPI, Docker Compose, authentification, rate-limiting, `POST /evaluate` | ✅ |
| **2** — Solidité | 350 QCM, 20 témoins, pipeline de validation, tâches ouvertes, `reproduce.sh` | ✅ |
| **3** — Extension | Amorces sw/yo/am, tâches non-QCM, LM Eval Harness, image Docker d'évaluation, dataset HF, Space Gradio, dossier académique | ✅ |
| **4** — Diffusion | HTML pré-généré, JSON-LD, filtres dans l'URL, sitemap, bundling Vite, tests Vitest, icônes SVG | ✅ |

### 19.2 Les cinq chantiers suivants, par ordre de priorité

**1. Débloquer la validation externe.** C'est le verrou unique qui bloque simultanément la crédibilité scientifique, la soumission académique et la résolution du risque d'essentialisation culturelle. Tout l'outillage existe ; il manque trois personnes. Canaux identifiés dans [`docs/VALIDATORS.md`](VALIDATORS.md) : Masakhane, Deep Learning Indaba, UCAD, universités de Nairobi, Addis-Abeba, Lagos, Accra.

**2. Rejouer les modèles sur le corpus complet.** Sept modèles et plus sur 350 questions, avec bootstrap et McNemar recalculés. Effet mécanique : intervalles de confiance divisés par environ 1,9 (√(350/101)), donc un classement enfin discriminant. Coût : budget d'inférence.

**3. Sortir les tâches ouvertes du dry-run.** Faire répondre de vrais modèles aux 25 items, faire noter le juge, publier les premiers scores non-QCM. C'est la réponse de fond au plafonnement, parce qu'on ne devine pas une réponse ouverte.

**4. Multilingue réel.** Au moins 50 items validés par un locuteur natif dans chacune des trois langues, puis premiers scores officiels hors français. Premier test réel de l'hypothèse que les modèles sont fortement dégradés dans les langues africaines.

**5. Publication.** Push du dataset et du Space sur Hugging Face, puis soumission au *datasets track* ACL/NeurIPS/EMNLP 2027 — après les points 1 et 2, qui en sont les prérequis.

---

## 20. Reproduire le projet : mode opératoire

### 20.1 Vérifier la chaîne sans dépenser un centime

```bash
git clone https://github.com/YTILIKAN/AfriBench && cd AfriBench
./scripts/reproduce.sh --mock
```

Cette commande crée l'environnement, valide le corpus, exécute une évaluation simulée déterministe et produit un classement. Aucune clé d'API requise. C'est la porte d'entrée pour un contributeur ou un évaluateur qui veut vérifier que tout tient debout.

### 20.2 Évaluer un vrai modèle

```bash
cp .env.example .env          # renseigner OPENAI_API_KEY, ANTHROPIC_API_KEY, ...
./scripts/reproduce.sh --model gpt-4o
```

Ou en ligne de commande directe :

```bash
pip install -r requirements.txt
export OPENAI_API_KEY="sk-..."
python scripts/afribench.py run --model gpt-4o
python scripts/afribench.py leaderboard
```

### 20.3 Lancer la plateforme complète

```bash
docker compose up --build
# Site : http://localhost:3000 · API : http://localhost:8080/api/v1 · Docs : /docs
```

### 20.4 Vérifier avec l'outil standard de la communauté

```bash
pip install lm-eval
python scripts/export_lm_eval_dataset.py
lm_eval --model openai-chat-completions --model_args model=gpt-4o \
        --tasks afribench --include_path scripts/lm_eval_tasks/ --num_fewshot 0
```

### 20.5 Passer les tests

```bash
cd backend && PYTHONPATH=. pytest -q      # 61 tests
cd frontend && npm install && npm test    # Vitest
cd frontend && npm run lint               # ESLint
```

### 20.6 Contrôler l'état scientifique du projet

```bash
python scripts/validation_status.py       # couverture de validation externe
python scripts/submission_readiness.py    # checklist de soumission académique
python scripts/stats_analysis.py --results data/results/_seed_v0.1.json
```

---

## 21. Bilan pédagogique

Le projet d'été Y'TILIKAN avait un double objet : produire un artefact utile, et former.

### 21.1 Compétences traversées

| Domaine | Contenu réellement pratiqué |
|---|---|
| Ingénierie de données | Conception de schéma, sourcing, versionnement, exports multi-formats, contrôles de cohérence automatisés |
| Évaluation de LLM | Ingénierie de prompt, appels à trois familles d'API, parsing robuste, gestion des limites de débit, mode simulé déterministe |
| Statistiques | Bootstrap, intervalles de confiance, test de McNemar, κ de Cohen, lecture honnête d'un écart non significatif |
| Backend | FastAPI, Pydantic v2, SQLAlchemy 2, Alembic, jobs asynchrones, verrous distribués, rate-limiting multi-backend, chiffrement de secrets |
| Frontend | Modules ES, Vite, Chart.js, design tokens, accessibilité ARIA, container queries, mode dégradé |
| DevOps | Docker multi-étages, Docker Compose, GitHub Actions, déploiement Railway, GitHub Pages, Hugging Face Spaces |
| Méthode | Auto-critique documentée, protocole d'annotation, consentement éclairé, préparation de publication |

### 21.2 Les trois leçons transférables

**Le plus difficile n'est pas de construire, c'est de mesurer honnêtement.** Écrire le classement a pris quelques heures. Comprendre que ce classement ne permet pas de conclure — et le publier quand même — a pris beaucoup plus, et c'est ce qui distingue un projet scientifique d'une démonstration.

**La contrainte locale est une source de conception, pas un handicap.** Le repli en cascade, la sobriété du bundle, l'absence de dépendance à une connexion stable : ces choix sont nés de nos conditions réelles de travail. Ils constituent aussi de meilleures pratiques d'ingénierie que la moyenne des projets conçus dans l'abondance.

**L'auto-critique publique accélère.** `CRITIQUE.md` a été écrit en juin, au moment où le projet semblait terminé. Ce document a produit 17 issues, qui ont produit 28 pull requests, qui ont produit tout ce qui est décrit dans ce rapport. Nommer ses faiblesses est la façon la plus rapide de les transformer en plan de travail.

---

## Annexe A — Glossaire

| Terme | Traduction en clair |
|---|---|
| **LLM** (*Large Language Model*) | Modèle de langage. L'IA qui produit du texte : ChatGPT, Claude, Gemini, DeepSeek. |
| **Benchmark** | Examen standardisé pour comparer des modèles dans les mêmes conditions. |
| **Accuracy** | Taux de bonnes réponses. 96 % = 97 bonnes réponses sur 101. |
| **QCM** | Question à choix multiples. Ici : quatre options, une seule correcte. |
| **Zero-shot** | On pose la question sans donner d'exemple préalable. On mesure la connaissance, pas la capacité à imiter un format. |
| **Few-shot** | On donne quelques exemples corrigés avant de poser la vraie question. |
| **Température** | Réglage du hasard dans la génération. À 0, le modèle donne toujours la même réponse : indispensable pour être reproductible. |
| **Intervalle de confiance** | La marge d'erreur, comme dans un sondage. « 96 % [92 ; 99] » signifie que la vraie valeur est très probablement entre 92 et 99. |
| **Bootstrap** | Méthode qui rejoue 2 000 fois l'examen en retirant des questions au hasard, pour estimer la marge d'erreur. |
| **Test de McNemar** | Test statistique qui répond à : « la différence entre ces deux modèles est-elle réelle ou due au hasard ? » |
| **κ de Cohen** | Mesure l'accord entre deux correcteurs *au-delà* de ce que le hasard produirait. |
| **Question témoin** | Question de contrôle, non africaine, qui sert à calibrer la difficulté du test lui-même. |
| **API** | Guichet informatique. Un programme demande, un autre répond, dans un format convenu. |
| **Endpoint** | Une adresse précise de ce guichet, avec sa fonction propre. |
| **Frontend / Backend** | La vitrine (ce que vous voyez) et l'arrière-boutique (ce qui calcule). |
| **SPA** (*Single Page Application*) | Site qui recharge son contenu sans recharger la page entière. |
| **Docker** | Conteneur standardisé qui emballe une application *et* son environnement, pour qu'elle tourne à l'identique partout. |
| **CI/CD** | Intégration et déploiement continus : des robots qui testent et publient automatiquement à chaque modification. |
| **Migration** | Modification structurée d'une base de données déjà en service. |
| **Rate limiting** | Limitation du nombre de requêtes par visiteur, pour protéger le service. |
| **Fallback / repli** | Plan B automatique quand le plan A échoue. |
| **Bootstrap.json** | Petit fichier d'amorçage qui permet au site d'afficher quelque chose immédiatement, avant que l'API réponde. |
| **XSS** | Faille où un texte malveillant injecté dans une page est exécuté comme du code. |
| **ARIA** | Attributs HTML qui rendent une page compréhensible par un lecteur d'écran. |
| **LLM-as-judge** | Utiliser un modèle de langage pour corriger les réponses ouvertes d'un autre modèle, selon une grille. |
| **Dry-run** | Répétition à blanc : on vérifie que la mécanique fonctionne sans que les résultats aient de valeur. |
| **Hugging Face** | Plateforme de référence pour partager modèles, datasets et démonstrations d'IA. |
| **LM Evaluation Harness** | Outil standard de la communauté pour exécuter des benchmarks de LLM. |

## Annexe B — Cartographie du dépôt

```
AfriBench/
├── backend/                   API FastAPI
│   ├── app/                   routeurs · services · modèles · sécurité
│   ├── alembic/versions/      4 migrations
│   └── tests/                 16 fichiers · 61 tests
├── frontend/                  SPA Vite + nginx
│   ├── index.html             shell, SEO, classement pré-généré
│   ├── src/                   entrée Vite, icônes Lucide
│   ├── js/                    noyau + 9 vues
│   ├── css/style.css          4 469 lignes de design system
│   ├── admin/                 backoffice autonome
│   ├── data/                  repli JSON + bootstrap
│   └── tests/                 Vitest · 30+ cas
├── data/                      SOURCE DE VÉRITÉ
│   ├── questions/v1/
│   │   ├── validated/         350 QCM (9 fichiers)
│   │   ├── witness/           20 témoins
│   │   ├── raw/               101 brouillons (base du seed)
│   │   ├── open/              25 tâches ouvertes (6 types)
│   │   └── translations/      sw · yo · am
│   ├── results/               résultats d'évaluation
│   ├── stats/                 rapports bootstrap + McNemar
│   ├── hf/                    export Hugging Face
│   ├── lm_eval/               export LM Eval Harness
│   └── DATASET_CARD.md
├── scripts/                   37 fichiers
│   ├── afribench.py           moteur d'évaluation (CLI)
│   ├── reproduce.sh           reproduction bout-en-bout
│   ├── stats_analysis.py      bootstrap + McNemar
│   ├── judges/                LLM-as-judge
│   ├── lm_eval_tasks/         11 tâches lm-eval
│   └── export_* · *_batch.py · validation_status.py · ...
├── configs/                   models.yaml (8 modèles) · categories.yaml (10)
├── hf_space/                  leaderboard Gradio
├── hf_evaluator/              stub documentaire
├── docs/                      protocoles · déploiement · CE RAPPORT
├── research/                  10 notes de cadrage + brouillon d'article
├── .github/workflows/         7 workflows
├── CRITIQUE.md                auto-critique publique
├── ROADMAP.md · CONTRIBUTING.md · CITATION.cff
└── docker-compose.yml · Dockerfile · railway.*.toml
```

## Annexe C — Récapitulatif des chiffres

| Élément | Valeur |
|---|---|
| QCM africains validés | 350 |
| Questions témoins | 20 |
| Total exportable | 370 |
| Questions du seed d'évaluation | 101 |
| Tâches ouvertes pilotes | 25 (6 types) |
| Amorces de traduction | 9 (3 langues) |
| Catégories | 9 (+ 1 témoin) |
| Sous-catégories | 99 |
| Répartition par difficulté | 102 / 136 / 112 |
| Modèles configurés | 8 |
| Modèles évalués | 7 |
| Amplitude des scores | 90,1 % – 96,0 % |
| Comparaisons McNemar significatives | 2 sur 21 |
| Couverture de validation externe | 0 % |
| Endpoints HTTP | 35 |
| Tables PostgreSQL | 7 |
| Migrations | 4 |
| Tests backend | 61 |
| Workflows CI/CD | 7 |
| Lignes Python | ~7 400 |
| Lignes JavaScript | ~3 750 |
| Lignes CSS | 4 469 |
| Commits | 151 |
| Pull requests fusionnées | 28 |
| Issues fermées | 17 |
| Durée | 19 mai → 23 août 2026 |

---

**AfriBench** · Y'TILIKAN · Prototype v0.1
*« Le savoir, c'est le pouvoir. »* — et mesurer, c'est savoir.

[github.com/YTILIKAN/AfriBench](https://github.com/YTILIKAN/AfriBench) · [ytilikan.org](https://www.ytilikan.org/) · contact@ytilikan.com
