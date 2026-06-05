# Configs — AfriBench

Fichiers de configuration pour les évaluations.

| Fichier | Description |
|---------|-------------|
| `models.yaml` | Modèles à évaluer (nom, provider, ID API, température, tokens) |
| `categories.yaml` | Catégories de questions (label, couleur pour graphiques) |

## Ajouter un modèle

Éditez `models.yaml` et ajoutez une entrée :

```yaml
- name: mon-modele
  label: "Mon Modèle"
  provider: openai          # openai, anthropic, google
  model_id: mon-modele-id
  api_base: https://api.example.com/v1   # optionnel (pour API compatibles OpenAI)
  api_key_env: MA_CLE_API
  max_tokens: 256
  temperature: 0.0
```

Puis définissez la variable d'environnement `MA_CLE_API`.
