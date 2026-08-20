# Soumission académique — checklist (issue #16)

Cibles : **ACL 2027** (datasets track / main), **NeurIPS 2027** Datasets & Benchmarks,
alternative **EMNLP 2027**.

## Prérequis

| Prérequis | État AfriBench (août 2026) |
|-----------|----------------------------|
| 300+ questions | ✅ 350 QCM Afrique |
| Validation 3+ experts africains | ❌ recrutement (`docs/VALIDATORS.md`) |
| 2–3 langues africaines | 🟡 scaffolding SW/YO/AM (draft MT) |
| LM Evaluation Harness | ✅ `afribench` / `afribench_all` |
| 15–20 modèles évalués | 🟡 7 modèles seed (101 Q) — re-run 300 requis |
| Analyse statistique (IC, tests) | 🟡 `scripts/stats_analysis.py` prêt (seed 101) ; à rejouer après eval 350 |
| Dataset card / datasheet | ✅ `data/DATASET_CARD.md` |
| Code + reproduce | ✅ `reproduce.sh`, Docker eval |
| Leaderboard public | 🟡 Space code prêt — deploy Hub manuel |
| Éthique / consentement annotateurs | 🟡 protocole validation documenté |

## Outline papier (draft)

1. **Introduction** — sous-représentation Afrique dans les benchmarks LLM
2. **Related work** — MMLU, Global-MMLU, IrokoBench, AfriMGSM, MadinahQA, Sahara…
3. **AfriBench** — taxonomie 9 catégories, témoins, tâches ouvertes
4. **Construction** — rédaction, sources, validation (κ inter-annotateurs)
5. **Multilingue** — protocole traduction native SW/YO/AM
6. **Évaluation** — protocol (T=0, zero-shot), modèles, lm-eval
7. **Résultats** — global / catégorie / difficulté / contrôle vs Afrique
8. **Analyse** — calibration, erreurs culturelles, plafonnement
9. **Limitations & ethics**
10. **Conclusion**

## Artefacts à joindre

- Dataset HF `YTILIKAN/AfriBench` (`python scripts/export_hf_dataset.py --push`)
- Code GitHub + DOI (Zenodo) du release
- Space leaderboard
- Appendix : prompts, exemples, grilles judge

## Prochaines actions concrètes

1. Recruter 3 validateurs → batches via `prepare_validation_batch.py`
2. Re-run modèles sur 350 QCM (+ witness) ; utiliser `scripts/stats_analysis.py`
3. Traduction native d’un sous-ensemble (≥50/langue) avant scale
4. Calculer IC bootstrap / McNemar pour paires de modèles
5. Rédiger datasheet section « motivation / collection / uses »
