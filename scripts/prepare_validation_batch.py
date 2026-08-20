#!/usr/bin/env python3
"""Extrait un batch de questions pour un validateur externe.

Usage:
  python scripts/prepare_validation_batch.py --size 40 --out data/validation/batch_01.jsonl
  python scripts/prepare_validation_batch.py --size 40 --seed 7 --validator validator_a
"""

from __future__ import annotations

import argparse
import json
import random
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
VALIDATED = REPO / "data" / "questions" / "v1" / "validated"


def load_all() -> list[dict]:
    items: list[dict] = []
    for path in sorted(VALIDATED.glob("*.json")):
        items.extend(json.loads(path.read_text(encoding="utf-8")))
    return items


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
    if len(chosen) > size:
        chosen = chosen[:size]
    # Compléter si sous-effectif
    if len(chosen) < size:
        rest = [q for q in items if q not in chosen]
        rng.shuffle(rest)
        chosen.extend(rest[: size - len(chosen)])
    return chosen


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--size", type=int, default=40)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--validator", default="validator_pending")
    p.add_argument("--out", type=Path, required=True)
    args = p.parse_args()

    rng = random.Random(args.seed)
    sample = stratified_sample(load_all(), args.size, rng)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8") as f:
        for q in sample:
            row = {
                "id": q["id"],
                "category": q.get("category"),
                "difficulty": q.get("difficulty"),
                "question": q.get("question"),
                "options": q.get("options"),
                "answer": q.get("answer"),
                "explanation": q.get("explanation"),
                "source": q.get("source"),
                "verdict": "",
                "corrected_answer": None,
                "corrected_question": None,
                "corrected_options": None,
                "comment": "",
                "validator_id": args.validator,
                "date": "",
            }
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(f"Wrote {len(sample)} items → {args.out}")


if __name__ == "__main__":
    main()
