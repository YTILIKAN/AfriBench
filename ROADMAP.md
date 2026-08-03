# Roadmap AfriBench — Solutions priorisées

> Version actionnable du [CRITIQUE.md](CRITIQUE.md). Ce qu'on fait, dans quel ordre, avec quel budget.

---

## 🔴 Phase 1 — Corrections critiques (0€)

**Objectif :** Réparer ce qui est cassé ou trompeur avant de construire plus.

- [x] **Bannière prototype** sur le site + README — "1er (v0.1)" / prototype
- [x] **Échapper le HTML** dans les rendus JS (`escapeHtml()`)
- [x] **Google Fonts `display=swap`**
- [x] **Skip-link** + **`<noscript>`**
- [ ] **Menu hamburger mobile** — voir PR #18 (`cursormobile-hamburger-repro-6e93`)
- [x] **Contraste** — charte Y'TILIKAN ivoire/indigo/orange
- [x] **Wording** — reproductible (scripts / protocole documenté)

## 🟣 Phase 1.5 — Architecture services

- [x] **Backend FastAPI** — `/api/v1/{results,questions,models,stats,leaderboard}`
- [x] **Frontend découplé** — charge l'API, fallback JSON statique
- [x] **Docker Compose** — `backend` (:8080) + `frontend` nginx (:3000)
- [x] **Auth / rate-limit** — `X-API-Key` + fenêtre glissante
- [x] **Endpoint POST /evaluate** — jobs async + `GET /jobs/{id}`

## 🟡 Phase 2 — Renforcement du benchmark (~0€)

- [ ] **200+ nouvelles questions** — cible : 300-350 total
- [ ] **20 questions témoins** — baseline non-africaine
- [ ] **3 validateurs africains**
- [ ] **10 questions de génération ouverte** + LLM-as-judge
- [x] **Documenter le protocole** sur le site (onglet Méthodologie)
- [x] **Lien script d'évaluation** sur le site
- [ ] **`reproduce.sh`** — voir PR #18

## 🟢 Phase 3 — Scale et internationalisation

- [ ] **Traduction** swahili / yoruba / amharique
- [ ] **Tâches non-QCM**
- [x] **Intégration LM Evaluation Harness** — tasks + `data/lm_eval/` + groupe `afribench_all`
- [x] **Dockerfile** d'évaluation + profile Compose `eval` + CI build
- [ ] **Soumission académique** — ACL/NeurIPS datasets track

## 🔵 Phase 4 — Frontend long-terme

- [ ] **HTML statique pré-généré** — crawlers
- [x] **Structured data** JSON-LD (schema.org/Dataset) + meta citation
- [x] **Filtres dans l'URL** — `?tab=&category=&difficulty=`
- [x] **Sitemap + robots.txt**
- [ ] **Asset bundling** (esbuild)
- [ ] **Tests frontend** (Vitest)
- [ ] **Icônes SVG accessibles**

---

*Dernière mise à jour : 3 août 2026*
