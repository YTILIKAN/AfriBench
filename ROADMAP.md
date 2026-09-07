# Roadmap AfriBench — Solutions priorisées

> Version actionnable du [CRITIQUE.md](CRITIQUE.md) (limites scientifiques) et de l'[audit de qualité](docs/AUDIT_QUALITE.md) (dette d'ingénierie).
> Les identifiants `#n` renvoient aux issues GitHub, les identifiants `Rn` aux entrées de l'audit.
> Pour comprendre *pourquoi* le système est construit ainsi : [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Phase 1 — Corrections critiques ✅

- [x] Bannière prototype / wording honnête / skip-link / noscript / fonts swap / échappement XSS
- [x] Menu hamburger mobile — sidebar off-canvas < 768 px (#1)

## Phase 1.5 — Architecture services ✅

- [x] Backend FastAPI + frontend découplé + Docker Compose
- [x] Auth / rate-limit + `POST /evaluate` + jobs

## Phase 2 — Renforcement du benchmark ✅

- [x] **300–350 questions africaines** — **350** QCM (était 101 → 210 → 300 → 350) (#3)
- [x] **20 questions témoins** — `data/questions/v1/witness/` (`is_control`) (#4)
- [x] Pipeline de validation externe complet (#5) : `validation_status.py`, lots stratifiés avec recouvrement, κ de Cohen, API `/validation/status`, `data/validation/` — *outillage livré ; validateurs à recruter (phase 5)*
- [x] Tâches ouvertes + juge `scripts/judges/llm_as_judge.py` (#6)
- [x] Protocole publié + lien vers le script sur le site (#7, #8)
- [x] `reproduce.sh` + `afribench.py --mock` (CI / hors ligne) (#9)

## Phase 3 — Extension ✅

- [x] Traduction multilingue — pipeline batch/apply sw/yo/am + API `/translations` (#14)
- [x] Tâches non-QCM — pipeline d'évaluation + agrégation + vue frontend + API `/open/*` (#15)
- [x] LM Evaluation Harness (`afribench`, `afribench_all`, 9 tâches par catégorie) (#12)
- [x] Dockerfile d'évaluation reproductible + CI (#13)
- [x] **Dataset HF prêt à publier** — `data/hf/YTILIKAN__AfriBench/` + `DATASET_CARD.md` (push Hub manuel) (#10)
- [x] **Space Gradio leaderboard** — `hf_space/` + sync CI + onglets tâches ouvertes / stats (#11)
- [x] Soumission académique — checklist auto + `paper-draft.md` + `CITATION.cff` + `publish_artifacts.sh` (#16)

## Phase 4 — Frontend long terme ✅

- [x] HTML pré-généré (classement statique + `bootstrap.json` + noscript enrichi) (#17)
- [x] JSON-LD Dataset + méta de citation
- [x] Filtres URL `?tab=&category=&difficulty=&page=`
- [x] Sitemap + robots.txt + manifeste web + favicon + image de partage
- [x] Bundling Vite (2 points d'entrée, backoffice inclus), Vitest (58 tests), icônes SVG Lucide
- [x] Audit de qualité (PR #48) : 20 défauts corrigés dont 3 critiques — site déployé inchargeable, XSS réfléchie, extraction de réponse faussée
- [x] Frontend post-audit (PR #49) : CSS consolidé, contrastes WCAG AA vérifiés en CI, axe-core sur 9 vues × 2 thèmes, règle ESLint XSS maison, Stylelint, `npm audit`
- [x] Documentation : architecture et fiches de décision, index, README de composants, rapport technique v1.1

---

## Phase 5 — Consolidation (septembre 2026 →) 🔄

Deux fronts en parallèle : la **dette d'ingénierie** laissée par l'audit (ordre de traitement : [AUDIT_QUALITE.md § 5](docs/AUDIT_QUALITE.md#5-ordre-de-traitement-recommandé)) et les **verrous scientifiques** ([RAPPORT_TECHNIQUE.md § 19.2](docs/RAPPORT_TECHNIQUE.md#192-les-cinq-chantiers-suivants-par-ordre-de-priorité)).

### Dette d'ingénierie

- [ ] **R32** — PostgreSQL de test (service dans `ci.yml`) + tests du CRUD d'administration et du `lifespan`. *Prérequis de R1, R2, R9, R13, R17.*
- [ ] **R1, R2, R10, R11** — sous-système d'évaluation repris en une passe : repli mémoire qui ne contourne plus le verrou PostgreSQL refusé, verrou consultatif pris et relâché sur une connexion dédiée, import de `afribench.py` sans empoisonnement de `sys.modules`, reprise des jobs sûre en multi-réplica
- [ ] **R3, R4** — intégrité des mesures : un run dont les échecs réseau dépassent un seuil n'est pas publié ; horodatages UTC typés (`DateTime(timezone=True)`)
- [ ] **R5, R7, R8** — backoffice : clé Fernet invalide → erreur au démarrage (pas de repli en clair) ; 503 sans base ; schémas Pydantic pour les quinze handlers CRUD ; nom de modèle assaini dans les chemins de fichiers
- [ ] **R6, R12** — observabilité du mode dégradé : `/health` teste la base et les migrations ; les `except: pass` du repli journalisent
- [ ] **R27** — lint Python (`ruff`) en CI
- [ ] **R13, R14, R15** — performance : pagination et jointure sur `/proposals`, `details` non chargé quand inutile, `/stats` mis en cache
- [ ] **R26** — dépendances backend épinglées (`pip-compile`)
- [ ] **R19** — évaluation sortie du processus web vers un worker qui persiste sa progression (fiche [D6](docs/ARCHITECTURE.md#d6--des-jobs-par-threads-et-verrou-consultatif-pas-de-file-de-messages) à réviser)
- [ ] R29, R30, R31 — chargement du corpus unifié, réglages de configuration non lus retirés ou branchés, tests tautologiques remplacés

### Verrous scientifiques

- [ ] **Validation externe** — recruter 3 validateurs ([docs/VALIDATORS.md](docs/VALIDATORS.md)), première campagne de lots, κ publié, couverture > 0 % sur `/validation/status`
- [ ] **Re-run sur 350 questions** — les 8 modèles configurés, bootstrap et McNemar recalculés, bannière d'écart seed/corpus éteinte automatiquement
- [ ] **Tâches ouvertes hors dry-run** — vraies réponses de modèles, juge exécuté, premiers scores non-QCM publiés
- [ ] **Multilingue réel** — ≥ 50 items `verified` par langue (sw, yo, am) → `official: true`
- [ ] **Publication** — push du dataset et du Space sur Hugging Face ; soumission *datasets track* 2027 (après les deux premiers points)

---

*Dernière mise à jour : 7 septembre 2026*
