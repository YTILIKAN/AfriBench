#!/usr/bin/env python3
"""Exporte les donnees du benchmark pour le frontend statique.

Usage:
    python scripts/export_frontend.py
    # Cree frontend/data/results.json et frontend/data/questions.json
"""

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data"
QUESTIONS_DIR = DATA_DIR / "questions" / "v1" / "validated"
RESULTS_DIR = DATA_DIR / "results"
FRONTEND_DATA = REPO_ROOT / "frontend" / "data"


def export_questions():
    """Compile toutes les questions validees en un seul fichier JSON."""
    all_qs = []
    if QUESTIONS_DIR.exists():
        for fpath in sorted(QUESTIONS_DIR.glob("*.json")):
            if fpath.name == "template.json":
                continue
            with open(fpath, encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    all_qs.extend(data)
                else:
                    all_qs.append(data)

    # Ajoute les infos de categorie et difficulte pour le filtrage
    FRONTEND_DATA.mkdir(parents=True, exist_ok=True)
    out_path = FRONTEND_DATA / "questions.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(all_qs, f, indent=2, ensure_ascii=False)

    print(f"Questions exportees : {len(all_qs)} -> {out_path}")


def export_results():
    """Compile tous les resultats d'evaluation en un seul fichier JSON."""
    all_results = []
    if RESULTS_DIR.exists():
        for fpath in sorted(RESULTS_DIR.glob("*.json")):
            try:
                with open(fpath, encoding="utf-8") as f:
                    all_results.append(json.load(f))
            except json.JSONDecodeError:
                print(f"  Ignore (JSON invalide) : {fpath.name}", file=sys.stderr)

    # Trier par timestamp (plus recent en premier)
    all_results.sort(key=lambda r: r.get("timestamp", ""), reverse=True)

    FRONTEND_DATA.mkdir(parents=True, exist_ok=True)
    out_path = FRONTEND_DATA / "results.json"

    if not all_results:
        # Preserve existing frontend data if no new results (e.g. CI without local results)
        if out_path.exists():
            with open(out_path, encoding="utf-8") as f:
                existing = json.load(f)
            if existing:
                print(f"  Preserve existing ({len(existing)} resultats)")
                return

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(all_results[:100], f, indent=2, ensure_ascii=False)

    print(f"Resultats exportes : {len(all_results)} -> {out_path}")


def main():
    print("Export des donnees pour le frontend...")
    export_questions()
    export_results()
    print("Termine. Lancez le frontend :")
    print("  cd frontend && python -m http.server 8000")


if __name__ == "__main__":
    main()
