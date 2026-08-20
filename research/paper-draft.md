# Brouillon papier AfriBench (issue #16)

> Statut : outline + sections stub — à compléter après validation externe et re-run 350 Q.

## Titre

**AfriBench: Evaluating Language Models on African Realities**

## Abstract (stub)

Large language models are evaluated primarily on Western-centric benchmarks.
We introduce AfriBench, an open benchmark of 350 multiple-choice questions
covering nine thematic categories of African history, geography, politics,
health, economy, technology, society, and cultural reasoning.
We describe construction, a planned external validation protocol with three
African experts, multilingual pilots (Swahili, Yoruba, Amharic), and open-ended
task pilots (translation, summarization, QA, NER, sentiment).
Preliminary results on seven frontier models reveal … *(à compléter)*.

## 1. Introduction

- Motivation : sous-représentation de l'Afrique dans MMLU, Global-MMLU, etc.
- Contributions : corpus, protocole, leaderboard ouvert, tâches ouvertes pilotes

## 2. Related Work

- MMLU, Global-MMLU, IrokoBench, AfriMGSM, MadinahQA, Sahara, …

## 3. AfriBench Design

- 9 catégories, 350 QCM + 20 témoins
- Taxonomie et critères de difficulté

## 4. Dataset Construction

- Sources, rédaction, relecture interne
- Validation externe (3 validateurs, κ inter-annotateurs) — voir `docs/VALIDATION_PROTOCOL.md`

## 5. Multilingual Extension

- Protocole traduction native SW/YO/AM
- Statut pilote : 3 items/langue (`data/questions/v1/translations/`)

## 6. Open-Ended Tasks

- Pilotes : traduction, résumé, QA, NER, sentiment
- Métriques : BLEU/COMET proxy, ROUGE-L, token F1, entity F1

## 7. Evaluation Protocol

- Zero-shot, T=0, lm-evaluation-harness tasks `afribench_*`

## 8. Results

- Tableaux depuis `data/stats/report.json` *(après re-run 350 Q)*

## 9. Limitations & Ethics

- Voir `docs/ANNOTATOR_CONSENT.md`, `data/DATASET_CARD.md`

## 10. Conclusion

## Artefacts

| Artefact | Chemin |
|----------|--------|
| Dataset HF | `data/hf/YTILIKAN__AfriBench/` |
| Code | GitHub YTILIKAN/AfriBench |
| Leaderboard | Hugging Face Space + GitHub Pages |
| Reproduction | `scripts/reproduce.sh` |
