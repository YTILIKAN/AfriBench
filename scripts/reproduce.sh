#!/usr/bin/env bash
# AfriBench — reproduction bout-en-bout des résultats
#
# Usage:
#   ./scripts/reproduce.sh                  # évalue tous les modèles configurés
#   ./scripts/reproduce.sh --model gpt-4o   # un modèle précis
#   ./scripts/reproduce.sh --skip-eval      # exporte seulement le frontend
#
# Prérequis : Python ≥ 3.10, clés API dans .env (voir .env.example)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SKIP_EVAL=0
EXTRA_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-eval)
      SKIP_EVAL=1
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
echo "==> Installation des dépendances"
"$PYTHON" -m pip install -q -r requirements.txt || \
  "$PYTHON" -m pip install -q --user -r requirements.txt

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
  if [[ ${#EXTRA_ARGS[@]} -gt 0 ]]; then
    "$PYTHON" scripts/afribench.py run "${EXTRA_ARGS[@]}"
  else
    "$PYTHON" scripts/afribench.py run
  fi
  echo "==> Leaderboard"
  "$PYTHON" scripts/afribench.py leaderboard || true
else
  echo "==> Évaluation ignorée (--skip-eval)"
fi

# ── Export frontend ──────────────────────────────────────
echo "==> Export des données frontend"
"$PYTHON" scripts/export_frontend.py

echo ""
echo "Reproduction terminée."
echo "  Résultats : data/results/"
echo "  Frontend  : cd frontend && python -m http.server 8000"
