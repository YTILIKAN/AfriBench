#!/usr/bin/env python3
"""Prépare un batch de traduction pour un traducteur natif (issue #14).

Usage:
  python scripts/prepare_translation_batch.py --lang sw --size 30 \\
    --translator translator_sw_01 --out data/validation/translation_sw_batch.jsonl
"""

from __future__ import annotations

import argparse
import json
import random
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
VALIDATED = REPO / "data" / "questions" / "v1" / "validated"
TRANSLATIONS = REPO / "data" / "questions" / "v1" / "translations"

LANG_NAMES = {"sw": "Swahili", "yo": "Yoruba", "am": "Amharic"}


def load_french() -> list[dict]:
    items: list[dict] = []
    for path in sorted(VALIDATED.glob("*.json")):
        items.extend(json.loads(path.read_text(encoding="utf-8")))
    return items


def already_translated(lang: str) -> set[str]:
    folder = TRANSLATIONS / lang
    ids: set[str] = set()
    if not folder.exists():
        return ids
    for path in folder.glob("*.json"):
        for row in json.loads(path.read_text(encoding="utf-8")):
            tid = row.get("translation_of") or row.get("id")
            if tid:
                ids.add(tid)
    return ids


def stratified_sample(items: list[dict], size: int, rng: random.Random) -> list[dict]:
    by_cat: dict[str, list[dict]] = defaultdict(list)
    for q in items:
        by_cat[q.get("category", "unknown")].append(q)
    cats = sorted(by_cat)
    if not cats:
        return []
    per = max(1, size // len(cats))
    chosen: list[dict] = []
    for cat in cats:
        pool = by_cat[cat][:]
        rng.shuffle(pool)
        chosen.extend(pool[:per])
    rng.shuffle(chosen)
    return chosen[:size] if len(chosen) > size else chosen


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--lang", choices=["sw", "yo", "am"], required=True)
    p.add_argument("--size", type=int, default=30)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--translator", default="translator_pending")
    p.add_argument("--out", type=Path, required=True)
    args = p.parse_args()

    rng = random.Random(args.seed)
    done = already_translated(args.lang)
    pool = [q for q in load_french() if q["id"] not in done]
    sample = stratified_sample(pool, args.size, rng)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8") as f:
        for q in sample:
            row = {
                "translation_of": q["id"],
                "category": q.get("category"),
                "difficulty": q.get("difficulty"),
                "source_language": "fr",
                "target_language": args.lang,
                "target_language_name": LANG_NAMES[args.lang],
                "question_fr": q.get("question"),
                "options_fr": q.get("options"),
                "answer_fr": q.get("answer"),
                "explanation_fr": q.get("explanation"),
                "question": "",
                "options": None,
                "answer": "",
                "explanation": "",
                "translator_id": args.translator,
                "translation_status": "pending",
                "comment": "",
            }
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(f"Wrote {len(sample)} items → {args.out}")


if __name__ == "__main__":
    main()
