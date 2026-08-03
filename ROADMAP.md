# Roadmap AfriBench — Solutions priorisées

> Version actionnable du [CRITIQUE.md](CRITIQUE.md).

---

## 🔴 Phase 1 — Corrections critiques

- [x] Bannière prototype / wording honnête / skip-link / noscript / fonts swap / XSS escape
- [ ] Menu hamburger mobile — PR #18

## 🟣 Phase 1.5 — Architecture services

- [x] Backend FastAPI + frontend découplé + Docker Compose
- [x] Auth / rate-limit + `POST /evaluate` + jobs

## 🟡 Phase 2 — Renforcement du benchmark

- [~] **200+ nouvelles questions** — 156 africaines (était 101) ; cible 300+
- [x] **20 questions témoins** — `data/questions/v1/witness/` (`is_control`)
- [ ] 3 validateurs africains
- [ ] 10 questions de génération ouverte
- [x] Protocole + lien script sur le site
- [ ] `reproduce.sh` — PR #18

## 🟢 Phase 3 — Scale

- [ ] Traduction multilingue
- [ ] Tâches non-QCM
- [x] LM Evaluation Harness (`afribench` / `afribench_all`)
- [x] Dockerfile d'évaluation + CI
- [x] **Dataset HF prêt à publier** — `data/hf/YTILIKAN__AfriBench/` + `DATASET_CARD.md` (push Hub manuel)
- [x] **Space Gradio leaderboard** — `hf_space/` (+ stub `hf_evaluator/`)
- [ ] Soumission académique

## 🔵 Phase 4 — Frontend long-terme

- [x] HTML pré-généré (classement statique + `bootstrap.json` + noscript enrichi)
- [x] JSON-LD Dataset + citation meta
- [x] Filtres URL `?tab=&category=&difficulty=`
- [x] Sitemap + robots.txt
- [ ] Asset bundling / Vitest / icônes SVG

---

*Dernière mise à jour : 3 août 2026*
