#!/usr/bin/env python3
"""Copie frontend/data/* → hf_space/data/ pour le Space Gradio.

Usage:
  python scripts/export_frontend.py
  python scripts/sync_hf_space_data.py
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FRONTEND_DATA = REPO / "frontend" / "data"
DST_DIR = REPO / "hf_space" / "data"

FILES = (
    "results.json",
    "questions.json",
    "open_scores.json",
    "bootstrap.json",
)

OPTIONAL_STATS = (
    REPO / "data" / "stats" / "seed_report.json",
    REPO / "data" / "stats" / "report.json",
)


def main() -> None:
    if not (FRONTEND_DATA / "results.json").exists():
        raise SystemExit(f"Introuvable : {FRONTEND_DATA / 'results.json'} — lancer export_frontend.py")
    DST_DIR.mkdir(parents=True, exist_ok=True)
    for name in FILES:
        src = FRONTEND_DATA / name
        if src.exists():
            shutil.copy2(src, DST_DIR / name)
            print(f"Synced {src.name}")
    for stats_src in OPTIONAL_STATS:
        if stats_src.exists():
            shutil.copy2(stats_src, DST_DIR / "stats.json")
            print(f"Synced stats ← {stats_src.name}")
            break
    manifest = {
        "synced_files": [n for n in FILES if (FRONTEND_DATA / n).exists()],
        "corpus_questions": None,
    }
    qpath = DST_DIR / "questions.json"
    if qpath.exists():
        data = json.loads(qpath.read_text(encoding="utf-8"))
        if isinstance(data, list):
            manifest["corpus_questions"] = len(data)
    (DST_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"→ {DST_DIR}")


if __name__ == "__main__":
    main()
