#!/usr/bin/env bash
# Prépare / pousse le Space Gradio AfriBench vers Hugging Face.
#
# Usage:
#   ./scripts/deploy_hf_space.sh              # sync local seulement
#   ./scripts/deploy_hf_space.sh --push       # nécessite HF_TOKEN + git/hf
#
# Variables :
#   HF_SPACE_ID   défaut : YTILIKAN/AfriBench-Leaderboard
#   HF_TOKEN      token write Hugging Face

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PUSH=0
for arg in "$@"; do
  case "$arg" in
    --push) PUSH=1 ;;
    *) echo "Arg inconnu: $arg" >&2; exit 1 ;;
  esac
done

SPACE_ID="${HF_SPACE_ID:-YTILIKAN/AfriBench-Leaderboard}"
STAGE="${HF_SPACE_STAGE:-/tmp/afribench-space}"

echo "==> Sync data → hf_space/data"
python3 scripts/export_frontend.py
python3 scripts/sync_hf_space_data.py

echo "==> Stage Space → $STAGE"
rm -rf "$STAGE"
mkdir -p "$STAGE"
cp hf_space/app.py hf_space/about.py hf_space/utils.py hf_space/requirements.txt "$STAGE/"
# README Space (YAML header) doit s'appeler README.md à la racine du Space
cp hf_space/README.md "$STAGE/README.md"
mkdir -p "$STAGE/data"
cp -r hf_space/data/. "$STAGE/data/"

echo "    Fichiers :"
find "$STAGE" -type f | sort

if [[ "$PUSH" -eq 0 ]]; then
  echo ""
  echo "Staging prêt (pas de push)."
  echo "Pour publier :"
  echo "  export HF_TOKEN=hf_xxx"
  echo "  ./scripts/deploy_hf_space.sh --push"
  exit 0
fi

if [[ -z "${HF_TOKEN:-}" ]]; then
  echo "HF_TOKEN manquant — impossible de pousser." >&2
  exit 1
fi

if ! command -v huggingface-cli >/dev/null 2>&1 && ! python3 -c "import huggingface_hub" 2>/dev/null; then
  echo "==> Install huggingface_hub"
  python3 -m pip install -q huggingface_hub
fi

echo "==> Upload → $SPACE_ID"
python3 - <<PY
from huggingface_hub import HfApi
import os
api = HfApi(token=os.environ["HF_TOKEN"])
api.create_repo(repo_id="${SPACE_ID}", repo_type="space", space_sdk="gradio", exist_ok=True)
api.upload_folder(folder_path="${STAGE}", repo_id="${SPACE_ID}", repo_type="space")
print("Uploaded to https://huggingface.co/spaces/${SPACE_ID}")
PY
