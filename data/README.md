# AfriBench — Données (source de vérité)

Ce dossier est **l'original** du benchmark. Tout le reste — base PostgreSQL, exports du site, dataset Hugging Face, tâches LM Evaluation Harness — en est une copie régénérable. Quand deux copies divergent, c'est ce dossier qui a raison.

> **En clair.** L'original du manuscrit est dans le coffre (ce dossier, versionné par Git). Les photocopies qui circulent au guichet (la base) ou en vitrine (le site) peuvent être annotées ou périmées ; on les refait toujours depuis l'original. Pourquoi ce choix : [fiche de décision D1](../docs/ARCHITECTURE.md#d1--les-fichiers-json-versionnés-sont-la-source-de-vérité).

**Inventaire (7 septembre 2026) :** 350 QCM validés · 101 brouillons (seed d'évaluation) · 20 témoins · 25 tâches ouvertes · 9 amorces de traduction · 1 résultat versionné (7 modèles) · 2 rapports statistiques.

---

## Arborescence

```
data/
├── questions/
│   ├── template.json                 Gabarit d'un QCM (tous les champs, avec commentaires)
│   ├── template_open.json            Gabarit d'une tâche ouverte
│   ├── README.md                     Conventions du dossier questions
│   └── v1/
│       ├── manifest.json             seed_version = 1 — contrat entre les fichiers et la base
│       ├── validated/                CORPUS DE RÉFÉRENCE — 350 QCM, un fichier par catégorie
│       ├── raw/                      101 brouillons initiaux — base du seul résultat publié
│       ├── witness/temoin.json       20 témoins non africains, is_control: true
│       ├── open/                     25 tâches ouvertes pilotes, 6 fichiers (un par type)
│       └── translations/{sw,yo,am}/  3 × 3 items, translation_status: draft_mt_unverified
├── results/
│   ├── _seed_v0.1.json               7 modèles × 101 questions — SEUL résultat versionné
│   ├── *.json                        Runs locaux (afribench.py run) — ignorés par Git
│   └── mock/                         Runs simulés (--mock) — ignorés par Git, exclus du classement
├── stats/
│   ├── seed_report.json              Bootstrap + McNemar sur le seed
│   └── open_tasks_dry_run.json       Dry-run des tâches ouvertes
├── hf/YTILIKAN__AfriBench/           Dataset Hugging Face : african.jsonl (350), control.jsonl (20), README, dataset_info
├── lm_eval/                          afribench.json + 9 fichiers par catégorie + manifest.json (LM Evaluation Harness)
├── validation/                       Lots JSONL de validation externe — locaux, ignorés par Git
└── DATASET_CARD.md                   Carte de dataset (générée)
```

## Le corpus validé, par catégorie

| Fichier | Catégorie | Préfixe d'identifiant | Questions |
|---|---|---|---|
| `histoire.json` | Histoire | `HIST` | 41 |
| `geographie.json` | Géographie | `GEOG` | 41 |
| `langue_culture.json` | Langue et culture | `LANG` | 40 |
| `droit_politique.json` | Droit et politique | `POL` | 38 |
| `economie.json` | Économie | `ECON` | 38 |
| `ia_technologie.json` | IA et technologie | `IA` | 38 |
| `raisonnement_culturel.json` | Raisonnement culturel | `CULT` | 38 |
| `sante_sciences.json` | Santé et sciences | `SANTE` | 38 |
| `societe.json` | Société | `SOC` | 38 |
| **Total** | 9 catégories, 99 sous-thèmes | | **350** |

Répartition par difficulté : 102 `easy` · 136 `medium` · 112 `hard`. Les libellés, descriptions et couleurs des catégories sont dans [`configs/categories.yaml`](../configs/categories.yaml).

## Le contrat d'une question

Gabarit : [`questions/template.json`](questions/template.json). Trois familles de champs :

| Famille | Champs | Rôle |
|---|---|---|
| **Identité** | `id` (`HIST-001`), `category`, `subcategory`, `difficulty` (`easy` \| `medium` \| `hard`), `language` (`fr`) | Classement, filtrage, stratification des lots |
| **Épreuve** | `question`, `options` (`{"A","B","C","D"}`), `answer` (une lettre) | Ce que le modèle voit, ce qu'on attend |
| **Auditabilité** | `explanation`, `source`, `author`, `date_created`, `date_validated`, `validated_by` | Ce qui permet à un tiers de **contester** le corrigé |

Deux exigences méthodologiques : **`source`** (référence vérifiable — UNESCO, travaux d'universitaires africains, textes juridiques régionaux) et **`explanation`** (le corrigé est justifié, donc discutable).

`date_validated` et `validated_by` sont **présents et vides sur les 350 items**. Ce n'est pas un oubli : c'est la trace machine-lisible dont [`scripts/validation_status.py`](../scripts/validation_status.py) et `GET /api/v1/validation/status` déduisent la couverture de validation externe — aujourd'hui **0 %**. Le projet publie ce chiffre plutôt que de le cacher.

## Invariants, et où ils sont vérifiés

| Invariant | Vérifié par | Quand |
|---|---|---|
| Champs obligatoires présents | `afribench.py validate` | CI, à chaque commit |
| `answer` ∈ options ; catégorie connue ; difficulté valide | `afribench.py validate` | CI |
| **Identifiants uniques sur tout le corpus** | `afribench.py validate` | CI — un doublon faisait échouer silencieusement le seed PostgreSQL et laissait la base vide |
| Corpus, export frontend et manifeste lm-eval cohérents | `backend/tests/test_consistency.py` | CI |
| Un JSON malformé est ignoré et journalisé, jamais un 500 | `_read_json` (backend), garde équivalente dans le CLI | Exécution |

```bash
python scripts/afribench.py validate                         # tout data/questions/v1
python scripts/afribench.py validate data/questions/v1/validated
```

## Les sous-corpus et leur statut

| Sous-corpus | Statut | Ce que le code en fait |
|---|---|---|
| **`validated/`** (350) | Corpus officiel | Seul jeu chargé par défaut par le CLI, le backend et les exports |
| **`raw/`** (101) | Brouillons historiques | Base du résultat `_seed_v0.1.json` ; conservés pour la reproductibilité des scores publiés |
| **`witness/`** (20) | Calibrage | `--questions witness`, `is_control: true`, **jamais mélangés au classement**, export séparé `control.jsonl` |
| **`open/`** (25) | Pilote | Endpoints `/open/*`, scores marqués `dry_run: true`, badge explicite sur le site |
| **`translations/`** (9) | Brouillon non officiel | `draft_mt_unverified` ; `official: false` tant que moins de 50 items ne sont pas `verified` — seuil codé dans le backend |

Chaque sous-dossier a son propre README : [`open/`](questions/v1/open/README.md), [`translations/`](questions/v1/translations/README.md), [`witness/`](questions/v1/witness/README.md), [`validation/`](validation/README.md).

## Versionnement : `manifest.json`

```json
{ "corpus": "v1", "seed_version": 1, "description": "…", "updated_at": "2026-08-24" }
```

`seed_version` est le **contrat entre le disque et la base**. Au démarrage du backend avec PostgreSQL, une question déjà en base n'est remplacée que si la version du fichier est **strictement supérieure** à celle stockée **et** si un administrateur ne l'a pas verrouillée (`locked_by_admin`). Après une correction massive du corpus, incrémenter `seed_version` force la resynchronisation ; une correction ponctuelle par pull request n'en a pas besoin si la base n'existe pas encore ou est recréée.

## Les résultats

Un run produit `results/<modèle>_<horodatage>.json` :

| Champ | Contenu |
|---|---|
| `model`, `model_label`, `timestamp`, `mock` | Identité du run |
| `total`, `correct`, `incorrect`, `no_answer`, `accuracy` | Scores globaux — `no_answer` (réponse illisible) est compté **à part**, ni juste ni faux |
| `by_category`, `by_difficulty` | Agrégats |
| `details[]` | Ligne à ligne : `id`, `expected`, `got`, `correct`, éventuellement `unparsed_response` — indispensable aux tests appariés (McNemar) et à l'audit des `no_answer` ; ~92 % du poids du fichier, retiré par défaut par l'API |

Seul `_seed_v0.1.json` est versionné : c'est la base des scores publics (7 modèles, 101 questions, 90,1 % – 96,0 %). Les runs locaux et simulés sont ignorés par Git (`.gitignore`) pour qu'aucun résultat non revu n'entre dans le classement par accident.

## Ajouter ou corriger une question

1. Respecter `template.json` ; identifiant unique au préfixe de la catégorie ; `source` et `explanation` renseignés.
2. `python scripts/afribench.py validate`.
3. `python scripts/export_frontend.py` puis `python scripts/export_lm_eval_dataset.py` et `python scripts/export_hf_dataset.py` pour que les copies suivent (la CI vérifie leur cohérence).
4. Pull request. Sans terminal : la vue *Participer* du site (vote communautaire) ou le formulaire d'issue GitHub. Guide complet : [`CONTRIBUTING.md`](../CONTRIBUTING.md).

---

Documents liés : [Architecture § 4](../docs/ARCHITECTURE.md#4-la-couche-données--source-de-vérité) · [Rapport technique § 5](../docs/RAPPORT_TECHNIQUE.md#5-le-corpus--le-sujet-dexamen) · [Carte de dataset](DATASET_CARD.md) · [Protocole de validation](../docs/VALIDATION_PROTOCOL.md) · [Index de la documentation](../docs/README.md)
