# Analyse & audit du benchmark AfriBench

Outils d'audit pour comprendre le plafonnement des scores (90-96 %, catégories
à 100 %) et distinguer les vrais écarts du bruit d'échantillon. Ces scripts
**ne modifient pas** le CLI d'évaluation (`afribench.py`) : ils réutilisent sa
couche de chargement/inférence et ajoutent des analyses en scripts séparés.

```bash
pip install -r requirements.txt
```

Toutes les sorties vont dans `data/results/contamination/` et
`data/results/stats/`. Toutes les analyses ont une **graine fixe** (`--seed`,
défaut 42) → reproductibles.

---

## 1. Détection de contamination — `scripts/contamination.py`

Les sous-commandes `permute` et `noise` partagent le ciblage des questions :
`--category CAT` (répétable) restreint aux catégories suspectes, `--per-category N`
échantillonne N questions par catégorie (reproductible, tri par id), `--limit N`
plafonne le total. Restez économe : ciblez les catégories à 100 %, `--limit` serré.

### 1.0 Bruit de base de l'API (`noise`) — *à faire AVANT le permute*

`temperature=0.0` ne garantit **pas** un déterminisme parfait via API (batching
serveur, non-déterminisme GPU). Avant d'attribuer un flip à la mémorisation, on
mesure ce bruit : on rejoue **N fois le MÊME prompt** (ordre inchangé) et on
compte les désaccords.

```bash
python scripts/contamination.py noise --model gemini-2.5-flash-lite \
    --category geographie --category langue_culture --per-category 6 \
    --repeats 2 --delay 5
```

**Sortie** : `baseline_flip_rate` global et par catégorie
(`data/results/contamination/noise_<modele>_<ts>.json`). **C'est le seuil** : un
`flip_rate` du permute proche de ce bruit n'est **pas** interprétable comme
mémorisation.

### 1.1 Option-order probe (`permute`) — *prioritaire*

Ré-évalue chaque question avec l'ordre des options A/B/C/D **permuté**
(l'original + N permutations aléatoires fixées par seed) et mesure la
**stabilité** de la réponse.

```bash
# Un modèle, 3 permutations (=> 4 ordres évalués par question)
python scripts/contamination.py permute --model gpt-4o

# Démo économe : 20 questions, pacing pour les quotas gratuits
python scripts/contamination.py permute --model gemini-2.5-flash-lite \
    --limit 20 --permutations 3 --seed 42 --delay 5 --verbose
```

**Coût** : `n_questions × (1 + permutations)` appels API par modèle. Utilisez
`--limit` et `--delay` pour tester sans exploser un quota.

**Sortie** (`data/results/contamination/permute_<modele>_<ts>.json` + stdout) :

| Métrique | Sens |
|---|---|
| `orig_accuracy` | précision sur l'ordre original |
| `mean_perm_accuracy` | précision moyenne sur tous les ordres |
| `flip_rate` | % de questions où le **contenu** choisi change selon l'ordre |

**Interprétation** : une catégorie à **haute précision ET haut flip** (repérée
par `<-- signal`) suggère une **mémorisation positionnelle** — le modèle suit la
position mémorisée (« la bonne réponse est en B ») plutôt que le sens. Un modèle
robuste garde la même réponse quel que soit l'ordre (flip bas).

⚠️ **Comparez toujours au bruit de base (§1.0)** : un `flip_rate` qui ne dépasse
pas nettement le `baseline_flip_rate` est **non concluant** (bruit API, pas
mémorisation), pas « propre ».

### 1.2 Canary check (`canary`) — *à venir*
Insertion/vérification de chaînes témoins uniques dans le dataset publié, pour
détecter la régurgitation lors de futurs entraînements.

### 1.3 Min-K% Prob (`minkprob`) — *skip documenté*
Nécessite les **log-probs par token** de la question entière. Aucun des
providers actuels (OpenAI-compat / Anthropic / Google, via l'API *chat*) ne les
expose pour un texte fourni. L'analyse se termine proprement avec un message
explicite plutôt que de deviner un endpoint. À réactiver si l'on branche un
provider exposant les log-probs (ex. API *completions* avec `logprobs`).

---

## 2. Analyse statistique — `scripts/stats.py`

Lit les résultats produits par `afribench.py run` (`data/results/*.json`).
**Aucun appel API.**

### 2.1 Bootstrap des intervalles de confiance (`bootstrap`)

IC 95 % (rééchantillonnage percentile sur les questions) pour le score global
et par catégorie de chaque modèle.

```bash
python scripts/stats.py bootstrap
python scripts/stats.py bootstrap --results data/results/ --iterations 5000
python scripts/stats.py bootstrap --results un_resultat.json --model gpt-4o
```

**Sortie** (`data/results/stats/bootstrap_<ts>.json` + `.csv` + stdout) : pour
le global et chaque catégorie, deux intervalles à 95 % :
- **bootstrap** percentile (`ci_low`/`ci_high`) — comme demandé, rééchantillonnage
  sur les questions ;
- **Wilson** (`wilson_low`/`wilson_high`) — intervalle binomial **robuste aux
  bords**. Au bord (100 %/0 %) le bootstrap s'effondre (6/6 → `[100–100]`, faussement
  certain) alors que Wilson reste honnête (6/6 → ~`[61–100]`).

**Interprétation** : fiez-vous à **Wilson pour les catégories à 100 %**. Si les
IC de deux modèles se **chevauchent largement**, on ne peut pas les départager
sur cet échantillon → viser plus de questions par catégorie, ou les regrouper.

### 2.2 McNemar (`mcnemar`) — *à venir*
Test par paire de modèles : l'écart de précision est-il significatif ?

### 2.3 Questions non-discriminantes (`nondiscriminant`) — *à venir*
Liste les questions où **tous** les modèles répondent pareil (candidates au
retrait/remplacement).

---

## 3. Optimisation de prompt — `scripts/optimize_prompt.py` *(à venir)*

Optuna, avec garde-fous stricts : température figée à 0.0, objectif =
**taux de parsing correct + accord inter-modèles sur un split dev** (jamais le
score brut, pour ne pas sur-apprendre le benchmark). Meilleure config exportée
dans `configs/prompt_best.yaml`.
