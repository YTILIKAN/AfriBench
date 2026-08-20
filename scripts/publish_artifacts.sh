#!/usr/bin/env bash
# Publie les artefacts pour soumission académique + Space HF (issue #16).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

python scripts/export_frontend.py
python scripts/export_translations.py
python scripts/eval_open_tasks.py --dry-run
python scripts/aggregate_open_scores.py
python scripts/stats_analysis.py || true
python scripts/sync_hf_space_data.py
python scripts/submission_readiness.py --update-checklist

if [[ "${1:-}" == "--push-hf" ]]; then
  bash scripts/deploy_hf_space.sh --push
fi

echo "Artefacts prêts. Voir research/08-soumission-academique.md"
