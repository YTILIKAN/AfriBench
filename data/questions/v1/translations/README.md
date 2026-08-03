# Traductions AfriBench (scaffolding)

Cible Phase 3 : **swahili (`sw`)**, **yoruba (`yo`)**, **amharique (`am`)**.

## Principes

1. **Traducteurs natifs** + relecture croisée (pas de MT brute en production)
2. Adaptation culturelle si un item ne se traduit pas littéralement
3. Conserver `id` / `translation_of` aligné avec la version française `validated/`
4. Champ `language` = code BCP-47 (`sw`, `yo`, `am`)
5. `translation_status` : `draft_mt_unverified` | `human_draft` | `verified`

## Structure

```
translations/
├── README.md
├── sw/   # Kiswahili — pilot_draft.json
├── yo/   # Yorùbá — pilot_draft.json
└── am/   # አማርኛ — pilot_draft.json (placeholders EN jusqu'à traducteur)
```

## Statut actuel

| Langue | Couverture | Qualité |
|--------|------------|---------|
| `sw` | 3 items pilote | **draft MT — à valider** |
| `yo` | 3 items pilote | **draft MT — à valider** |
| `am` | 3 placeholders | **en attente traducteur natif** |

```bash
python scripts/export_translations.py          # → data/translations_export/
python scripts/export_translations.py --lang sw
```

Les exports portent `official: false` : **exclus du leaderboard**.

Budget estimé : 500–1000€ / partenariats Masakhane, Indaba, universités.
