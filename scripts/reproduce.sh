#!/usr/bin/env bash
# AfriBench — reproduction bout-en-bout des résultats
#
# Usage:
#   ./scripts/reproduce.sh                  # évalue tous les modèles configurés
#   ./scripts/reproduce.sh --model gpt-4o   # un modèle précis
#   ./scripts/reproduce.sh --skip-eval      # exporte seulement le frontend
#   ./scripts/reproduce.sh --mock           # évaluation déterministe (sans clés API)
#
# Prérequis : Python ≥ 3.10
# Clés API dans .env (voir .env.example) — non requises avec --mock ou --skip-eval

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SKIP_EVAL=0
MOCK=0
EXTRA_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-eval)
      SKIP_EVAL=1
      shift
      ;;
    --mock)
      MOCK=1
      shift
      ;;
    *)
      EXTRA_ARGS+=("$1")
      shift
      ;;
  esac
done

echo "==> AfriBench reproduce"
echo "    repo : $ROOT"

PYTHON="${PYTHON:-python3}"
if ! command -v "$PYTHON" >/dev/null 2>&1; then
  echo "Erreur : Python 3 introuvable (essayez PYTHON=python)." >&2
  exit 1
fi

# ── Dépendances ──────────────────────────────────────────
USE_VENV=1
if [[ ! -d .venv ]]; then
  echo "==> Création du virtualenv (.venv)"
  if ! "$PYTHON" -m venv .venv >/dev/null 2>&1; then
    echo "    (venv indisponible — utilisation de Python système)"
    rm -rf .venv
    USE_VENV=0
  fi
fi
if [[ "$USE_VENV" -eq 1 && -f .venv/bin/activate ]]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
  PYTHON=python
fi

REQ_FILE="requirements.txt"
if [[ ! -f "$REQ_FILE" && -f requirements-eval.txt ]]; then
  REQ_FILE="requirements-eval.txt"
fi
echo "==> Installation des dépendances ($REQ_FILE)"
"$PYTHON" -m pip install -q -r "$REQ_FILE" || \
  "$PYTHON" -m pip install -q --user -r "$REQ_FILE"

# ── Variables d'environnement ────────────────────────────
if [[ -f .env ]]; then
  echo "==> Chargement de .env"
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
else
  echo "    (pas de .env — utilisez les variables déjà exportées, cf. .env.example)"
fi

# ── Validation des questions ─────────────────────────────
echo "==> Validation des questions"
"$PYTHON" scripts/afribench.py validate data/questions/v1/validated

# ── Évaluation ───────────────────────────────────────────
if [[ "$SKIP_EVAL" -eq 0 ]]; then
  echo "==> Évaluation des modèles"
  RUN_ARGS=()
  if [[ "$MOCK" -eq 1 ]]; then
    RUN_ARGS+=(--mock)
  fi
  if [[ ${#EXTRA_ARGS[@]} -gt 0 ]]; then
    RUN_ARGS+=("${EXTRA_ARGS[@]}")
  fi
  "$PYTHON" scripts/afribench.py run "${RUN_ARGS[@]}"
  echo "==> Leaderboard"
  if [[ "$MOCK" -eq 1 ]]; then
    "$PYTHON" scripts/afribench.py leaderboard --include-mock || true
  else
    "$PYTHON" scripts/afribench.py leaderboard || true
  fi
else
  echo "==> Évaluation ignorée (--skip-eval)"
fi

# ── Export frontend + artefacts ──────────────────────────
# Les runs --mock écrivent dans data/results/mock/ et n'entrent pas
# dans l'export officiel (frontend/data/results.json).
if [[ "$MOCK" -eq 1 ]]; then
  echo "==> Export frontend ignoré en mode --mock (résultats non officiels)"
else
  echo "==> Export des données frontend"
  "$PYTHON" scripts/export_frontend.py
  if [[ -f scripts/generate_static_html.py ]]; then
    echo "==> HTML statique / bootstrap"
    "$PYTHON" scripts/generate_static_html.py || true
  fi
  if [[ -f scripts/sync_hf_space_data.py ]]; then
    echo "==> Sync Space Gradio"
    "$PYTHON" scripts/sync_hf_space_data.py || true
  fi
fi

echo ""
echo "Reproduction terminée."
echo "  Résultats : data/results/"
echo "  Frontend  : cd frontend && python -m http.server 8000"
if [[ "$MOCK" -eq 1 ]]; then
  echo "  Note      : résultats MOCK — ne pas publier comme classement officiel."
fi
