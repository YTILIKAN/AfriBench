#!/usr/bin/env python3
"""Copie frontend/data/results.json → hf_space/data/ pour le Space Gradio.

Usage:
  python scripts/export_frontend.py
  python scripts/sync_hf_space_data.py
"""

from __future__ import annotations

import shutil
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SRC = REPO / "frontend" / "data" / "results.json"
DST_DIR = REPO / "hf_space" / "data"
DST = DST_DIR / "results.json"


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Introuvable : {SRC} — lancer export_frontend.py d'abord")
    DST_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SRC, DST)
    # Copier aussi un extrait questions pour stats futures
    qsrc = REPO / "frontend" / "data" / "questions.json"
    if qsrc.exists():
        shutil.copy2(qsrc, DST_DIR / "questions.json")
    print(f"Synced {SRC} → {DST}")


if __name__ == "__main__":
    main()
