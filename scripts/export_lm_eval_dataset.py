#!/usr/bin/env python3
"""Exporte les questions validées au format attendu par LM Evaluation Harness.

Produit :
  data/lm_eval/afribench.json              — toutes les questions
  data/lm_eval/afribench_<category>.json   — une catégorie
  data/lm_eval/manifest.json               — compteurs

Usage :
  python scripts/export_lm_eval_dataset.py
"""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
QUESTIONS_DIR = REPO_ROOT / "data" / "questions" / "v1" / "validated"
OUT_DIR = REPO_ROOT / "data" / "lm_eval"


def load_questions() -> list[dict]:
    questions: list[dict] = []
    if not QUESTIONS_DIR.exists():
        print(f"Introuvable : {QUESTIONS_DIR}", file=sys.stderr)
        sys.exit(1)
    for fpath in sorted(QUESTIONS_DIR.glob("*.json")):
        if fpath.name == "template.json":
            continue
        with fpath.open(encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            questions.extend(data)
        elif isinstance(data, dict):
            questions.append(data)
    return questions


def main() -> None:
    questions = load_questions()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    all_path = OUT_DIR / "afribench.json"
    with all_path.open("w", encoding="utf-8") as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(questions)} → {all_path}")

    by_cat: dict[str, list] = {}
    for q in questions:
        cat = q.get("category") or "unknown"
        by_cat.setdefault(cat, []).append(q)

    for cat, items in sorted(by_cat.items()):
        path = OUT_DIR / f"afribench_{cat}.json"
        with path.open("w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=2)
        print(f"  {cat}: {len(items)} → {path.name}")

    manifest = {
        "version": "v1",
        "total": len(questions),
        "by_category": dict(sorted(Counter(q.get("category") for q in questions).items())),
        "by_difficulty": dict(sorted(Counter(q.get("difficulty") for q in questions).items())),
        "languages": sorted({q.get("language") for q in questions if q.get("language")}),
    }
    with (OUT_DIR / "manifest.json").open("w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"Manifest → {OUT_DIR / 'manifest.json'}")


if __name__ == "__main__":
    main()
