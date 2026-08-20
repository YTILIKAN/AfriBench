#!/usr/bin/env python3
"""Applique un batch JSONL revu par un traducteur natif.

Usage:
  python scripts/apply_translations.py --lang sw --batch data/validation/translation_sw_reviewed.jsonl
  python scripts/apply_translations.py --lang sw --batch ... --dry-run
"""

from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
TRANSLATIONS = REPO / "data" / "questions" / "v1" / "translations"


def load_french_by_id() -> dict[str, dict]:
    validated = REPO / "data" / "questions" / "v1" / "validated"
    out: dict[str, dict] = {}
    for path in validated.glob("*.json"):
        for q in json.loads(path.read_text(encoding="utf-8")):
            out[q["id"]] = q
    return out


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--lang", choices=["sw", "yo", "am"], required=True)
    p.add_argument("--batch", type=Path, required=True)
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    french = load_french_by_id()
    lang_dir = TRANSLATIONS / args.lang
    lang_dir.mkdir(parents=True, exist_ok=True)
    out_path = lang_dir / "verified.json"
    existing = json.loads(out_path.read_text(encoding="utf-8")) if out_path.exists() else []
    by_id = {r.get("translation_of") or r.get("id"): r for r in existing}

    stats = {"verified": 0, "human_draft": 0, "reject": 0, "missing": 0}
    for line in args.batch.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        src_id = row.get("translation_of") or row.get("id")
        status = (row.get("translation_status") or "pending").strip().lower()
        if status == "reject":
            stats["reject"] += 1
            continue
        if src_id not in french:
            stats["missing"] += 1
            continue
        src = french[src_id]
        if status not in {"verified", "human_draft"}:
            raise SystemExit(f"{src_id}: translation_status invalide {status!r}")
        entry = {
            "id": f"{args.lang.upper()}-{src_id}",
            "translation_of": src_id,
            "category": src.get("category"),
            "difficulty": src.get("difficulty"),
            "language": args.lang,
            "question": row.get("question") or row.get("question_fr"),
            "options": row.get("options") or row.get("options_fr"),
            "answer": row.get("answer") or row.get("answer_fr"),
            "explanation": row.get("explanation") or row.get("explanation_fr"),
            "translation_status": status,
            "translator_id": row.get("translator_id"),
            "date_translated": row.get("date") or date.today().isoformat(),
            "source": src.get("source"),
        }
        by_id[src_id] = entry
        stats[status] += 1

    merged = sorted(by_id.values(), key=lambda x: x.get("translation_of", ""))
    print("Stats:", stats)
    if args.dry_run:
        print("Dry-run — aucune écriture")
        return
    out_path.write_text(json.dumps(merged, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"→ {out_path} ({len(merged)} items)")


if __name__ == "__main__":
    main()
