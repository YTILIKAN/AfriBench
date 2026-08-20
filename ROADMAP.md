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
- [x] 3 validateurs africains — pipeline complet (#5) : `validation_status.py`, batches overlap, κ, API `/validation/status`, `data/validation/`
- [x] **10 questions ouvertes** + juge `scripts/judges/llm_as_judge.py`
- [x] Protocole + lien script sur le site
- [x] `reproduce.sh` + `afribench.py --mock` (CI / offline)

## 🟢 Phase 3 — Scale

- [x] Traduction multilingue — pipeline batch/apply SW/YO/AM + API `/translations` (#14)
- [x] Tâches non-QCM — pipeline eval + agrégation + onglet frontend + API `/open/*` (#15)
- [x] LM Evaluation Harness (`afribench` / `afribench_all`)
- [x] Dockerfile d'évaluation + CI
- [x] **Dataset HF prêt à publier** — `data/hf/YTILIKAN__AfriBench/` + `DATASET_CARD.md` (push Hub manuel)
- [x] **Space Gradio leaderboard** — `hf_space/` + sync CI + onglets tâches ouvertes/stats (#11)
- [x] Soumission académique — checklist auto + `paper-draft.md` + `CITATION.cff` + `publish_artifacts.sh` (#16)

## 🔵 Phase 4 — Frontend long-terme

- [x] HTML pré-généré (classement statique + `bootstrap.json` + noscript enrichi)
- [x] JSON-LD Dataset + citation meta
- [x] Filtres URL `?tab=&category=&difficulty=`
- [x] Sitemap + robots.txt
- [ ] Asset bundling / Vitest / icônes SVG

---

*Dernière mise à jour : 20 août 2026*
