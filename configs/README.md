# AfriBench — Configuration des évaluations

Deux fichiers YAML, lus par le moteur (`scripts/afribench.py`), le backend (`data_loader.py`, `seed_models()`) et les exports.

| Fichier | Contenu | Consommateurs |
|---|---|---|
| [`models.yaml`](models.yaml) | Les **8 modèles** évaluables : nom, libellé, fournisseur, identifiant d'API, variable de clé, paramètres de génération | `afribench.py`, `GET /api/v1/models/configured`, table `models` (seed au démarrage), backoffice |
| [`categories.yaml`](categories.yaml) | Les **9 catégories** + la catégorie `temoin` : libellé, description, couleur | `afribench.py validate`, agrégations, graphiques du site et du Space |

> Pourquoi ces réglages et pas d'autres (température 0, 256 tokens, prompt unique) : [fiche de décision D7](../docs/ARCHITECTURE.md#d7--température-0-zero-shot-prompt-unique).

---

## `models.yaml`

```yaml
models:
  - name: gpt-4o                 # identifiant interne, utilisé par --model et l'API
    label: "GPT-4o"              # libellé affiché
    provider: openai             # openai | anthropic | google
    model_id: gpt-4o             # identifiant chez le fournisseur
    api_key_env: OPENAI_API_KEY  # variable d'environnement contenant la clé
    max_tokens: 256
    temperature: 0.0
```

### Modèles configurés

| `name` | Libellé | `provider` | Clé (`api_key_env`) | Note |
|---|---|---|---|---|
| `gpt-4o` | GPT-4o | `openai` | `OPENAI_API_KEY` | |
| `gpt-4o-mini` | GPT-4o Mini | `openai` | `OPENAI_API_KEY` | |
| `claude-sonnet-4` | Claude Sonnet 4 | `anthropic` | `ANTHROPIC_API_KEY` | |
| `claude-haiku-4.5` | Claude Haiku 4.5 | `anthropic` | `ANTHROPIC_API_KEY` | |
| `mistral-large` | Mistral Large | `openai` + `api_base` | `MISTRAL_API_KEY` | API compatible OpenAI |
| `gemini-2.5-flash` | Gemini 2.5 Flash | `google` | `GEMINI_API_KEY` | clé envoyée en en-tête, jamais en URL |
| `deepseek-chat` | DeepSeek V4 | `openai` + `api_base` | `DEEPSEEK_API_KEY` | API compatible OpenAI |
| `llama-3.1-70b` | Llama 3.1 70B | `openai` + `api_base` | `TOGETHER_API_KEY` | via Together AI ; poids ouverts |

Les **conditions d'examen sont identiques pour tous** : `temperature: 0.0` (déterminisme), `max_tokens: 256`. Modifier ces valeurs pour un seul modèle rendrait la comparaison invalide ; le faire pour tous est une décision de protocole à consigner dans le rapport technique.

### Ajouter un modèle

1. Ajouter une entrée. Pour une API compatible OpenAI (Mistral, DeepSeek, Together, Groq, vLLM…), **aucun code n'est nécessaire** :

   ```yaml
   - name: mon-modele
     label: "Mon Modèle"
     provider: openai
     model_id: mon-modele-id
     api_base: https://api.example.com/v1
     api_key_env: MA_CLE_API
     max_tokens: 256
     temperature: 0.0
   ```

2. Définir `MA_CLE_API` dans `.env` (ou saisir la clé dans le backoffice : elle est alors chiffrée en base et prime sur la variable).
3. `python scripts/afribench.py list-models`, puis `run --model mon-modele --mock` pour un test à blanc.
4. Si le modèle est à **poids ouverts** et que son nom ne contient aucun des mots-clés reconnus (`llama`, `mistral`, `deepseek`, `qwen`, `gemma`…), ajouter le mot-clé à `OPEN_WEIGHT_KEYWORDS` dans `backend/app/services/data_loader.py` **et** à `isOpenModel` dans `frontend/js/app.js` — le badge « ouvert / propriétaire » en dépend.
5. Ajouter `MA_CLE_API` à `_SECRET_ENV_VARS` dans `backend/app/redaction.py` : la valeur de la variable sera masquée si elle apparaît dans un message d'erreur exposé par `GET /api/v1/jobs`.

Avec PostgreSQL, `seed_models()` insère la nouvelle entrée au prochain démarrage sans écraser une clé saisie dans le backoffice.

### Ajouter un fournisseur (API non compatible OpenAI)

Écrire `call_<provider>(model, prompt) -> str` dans `scripts/afribench.py` (clé via `_resolve_api_key`, **jamais en query string**), l'inscrire dans `PROVIDERS`, ajouter un test dans `backend/tests/`. Guide : [Architecture § 14.2](../docs/ARCHITECTURE.md#142--un-fournisseur-dapi).

---

## `categories.yaml`

```yaml
categories:
  histoire:
    label: "Histoire"
    description: "Histoire africaine (précoloniale, coloniale, post-coloniale)"
    color: "#C4A46A"
```

| Clé | Libellé | Préfixe d'identifiant | Couleur |
|---|---|---|---|
| `histoire` | Histoire | `HIST` | `#C4A46A` |
| `geographie` | Géographie | `GEOG` | `#4A90D9` |
| `droit_politique` | Droit et politique | `POL` | `#E57373` |
| `sante_sciences` | Santé et sciences | `SANTE` | `#81C784` |
| `langue_culture` | Langue et culture | `LANG` | `#FFB74D` |
| `economie` | Économie | `ECON` | `#9575CD` |
| `ia_technologie` | IA et technologie | `IA` | `#4DB6AC` |
| `societe` | Société | `SOC` | `#F06292` |
| `raisonnement_culturel` | Raisonnement culturel | `CULT` | `#A1887F` |
| `temoin` | Témoin (baseline) | `CTRL` | `#9E9E9E` — **hors classement**, réservé à `witness/` |

La clé est celle utilisée dans le champ `category` des questions et dans le filtre `?category=` de l'URL du site.

### Ajouter une catégorie

Une catégorie touche cinq endroits ; la CI (`test_consistency.py`) vérifie leur cohérence :

1. `categories.yaml` : clé, `label`, `description`, `color`.
2. `data/questions/v1/validated/<cle>.json` avec des identifiants au nouveau préfixe.
3. `frontend/js/app.js` : libellé dans `CATEGORY_MAP` — c'est aussi la **liste blanche** des filtres URL ; une catégorie absente est rejetée.
4. `scripts/afribench.py` : la colonne dans l'export CSV est codée en dur.
5. `scripts/lm_eval_tasks/afribench/` : dupliquer un `afribench_<cat>.yaml`, puis `python scripts/export_lm_eval_dataset.py`, `export_frontend.py`, `export_hf_dataset.py`.

Puis `afribench.py validate` et `cd backend && PYTHONPATH=. pytest -q`.

---

Documents liés : [scripts/README](../scripts/README.md) · [Architecture § 5.4 et § 14](../docs/ARCHITECTURE.md#54-les-fournisseurs) · [Index de la documentation](../docs/README.md)
