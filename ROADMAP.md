# Roadmap AfriBench — Solutions priorisées

> Version actionnable du [CRITIQUE.md](CRITIQUE.md).

---

## 🔴 Phase 1 — Corrections critiques

- [x] Bannière prototype / wording honnête / skip-link / noscript / fonts swap / XSS escape
- [x] Menu hamburger mobile — sidebar off-canvas &lt;768px

## 🟣 Phase 1.5 — Architecture services

- [x] Backend FastAPI + frontend découplé + Docker Compose
- [x] Auth / rate-limit + `POST /evaluate` + jobs

## 🟡 Phase 2 — Renforcement du benchmark

- [x] **300–350 questions africaines** — **350** QCM (était 101 → 210 → 300 → 350)
- [x] **20 questions témoins** — `data/questions/v1/witness/` (`is_control`)
- [~] 3 validateurs africains — kit prêt (`docs/VALIDATORS.md`, scripts batch)
- [x] **10 questions ouvertes** + juge `scripts/judges/llm_as_judge.py`
- [x] Protocole + lien script sur le site
- [x] `reproduce.sh` + `afribench.py --mock` (CI / offline)

## 🟢 Phase 3 — Scale

- [~] Traduction multilingue — pilotes SW/YO/AM + `export_translations.py` (hors leaderboard)
- [~] Tâches non-QCM — 25 pilotes (génération, QA, traduction, résumé, NER, sentiment) + stubs métriques
- [x] LM Evaluation Harness (`afribench` / `afribench_all`)
- [x] Dockerfile d'évaluation + CI
- [x] **Dataset HF prêt à publier** — `data/hf/YTILIKAN__AfriBench/` + `DATASET_CARD.md` (push Hub manuel)
- [x] **Space Gradio leaderboard** — `hf_space/` + `deploy_hf_space.sh` (push Hub manuel)
- [~] Soumission académique — checklist `research/08-soumission-academique.md`

## 🔵 Phase 4 — Frontend long-terme

- [x] HTML pré-généré (classement statique + `bootstrap.json` + noscript enrichi)
- [x] JSON-LD Dataset + citation meta
- [x] Filtres URL `?tab=&category=&difficulty=`
- [x] Sitemap + robots.txt
- [ ] Asset bundling / Vitest / icônes SVG

---

*Dernière mise à jour : 3 août 2026*
