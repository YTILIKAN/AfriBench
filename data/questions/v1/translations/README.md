# Traductions AfriBench (scaffolding)

Cible Phase 3 : **swahili (`sw`)**, **yoruba (`yo`)**, **amharique (`am`)**.

## Principes

1. **Traducteurs natifs** + relecture croisée (pas de MT brute en production)
2. Adaptation culturelle si un item ne se traduit pas littéralement
3. Conserver `id` aligné avec la version française `validated/`
4. Champ `language` = code BCP-47 (`sw`, `yo`, `am`)

## Structure

```
translations/
├── README.md
├── sw/   # Kiswahili
├── yo/   # Yorùbá
└── am/   # አማርኛ
```

Chaque dossier contient des JSON par catégorie (même schéma que `validated/`)
et un `STATUS.md`.

## Statut actuel

| Langue | Couverture | Qualité |
|--------|------------|---------|
| `sw` | échantillon pilote (brouillon) | **draft MT — à valider** |
| `yo` | structure seule | en attente traducteur |
| `am` | structure seule | en attente traducteur |

Budget estimé : 500–1000€ / partenariats Masakhane, Indaba, universités.
