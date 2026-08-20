#!/usr/bin/env python3
"""Applique un batch JSONL revu par un validateur sur data/questions/v1/validated/.

Usage:
  python scripts/apply_validations.py --batch data/validation/batch_01_reviewed.jsonl
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
VALIDATED = REPO / "data" / "questions" / "v1" / "validated"
REJECTED = REPO / "data" / "questions" / "v1" / "rejected"


def load_by_id() -> tuple[dict[str, dict], dict[str, Path]]:
    items: dict[str, dict] = {}
    homes: dict[str, Path] = {}
    for path in VALIDATED.glob("*.json"):
        data = json.loads(path.read_text(encoding="utf-8"))
        for q in data:
            items[q["id"]] = q
            homes[q["id"]] = path
    return items, homes


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--batch", type=Path, required=True)
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--export", action="store_true", help="Régénère export_frontend + export_translations")
    args = p.parse_args()

    items, homes = load_by_id()
    by_path: dict[Path, list[dict]] = {}
    for path in VALIDATED.glob("*.json"):
        by_path[path] = json.loads(path.read_text(encoding="utf-8"))

    stats = {"ok": 0, "fix": 0, "reject": 0, "missing": 0}
    rejected: list[dict] = []

    for line in args.batch.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        qid = row["id"]
        verdict = (row.get("verdict") or "").strip().lower()
        if qid not in items:
            stats["missing"] += 1
            continue
        q = items[qid]
        path = homes[qid]
        arr = by_path[path]
        idx = next(i for i, x in enumerate(arr) if x["id"] == qid)

        if verdict == "reject":
            stats["reject"] += 1
            q = dict(arr[idx])
            q["validated_by"] = row.get("validator_id")
            q["date_validated"] = row.get("date") or date.today().isoformat()
            q["validation_notes"] = row.get("comment") or "rejected"
            rejected.append(q)
            arr.pop(idx)
            continue

        if verdict not in {"ok", "fix"}:
            raise SystemExit(f"{qid}: verdict invalide {verdict!r} (ok|fix|reject)")

        if verdict == "fix":
            stats["fix"] += 1
            if row.get("corrected_answer"):
                arr[idx]["answer"] = row["corrected_answer"]
            if row.get("corrected_question"):
                arr[idx]["question"] = row["corrected_question"]
            if row.get("corrected_options"):
                arr[idx]["options"] = row["corrected_options"]
        else:
            stats["ok"] += 1

        arr[idx]["validated_by"] = row.get("validator_id")
        arr[idx]["date_validated"] = row.get("date") or date.today().isoformat()
        if row.get("comment"):
            arr[idx]["validation_notes"] = row["comment"]

    print("Stats:", stats)
    if args.dry_run:
        print("Dry-run — aucune écriture")
        return

    for path, arr in by_path.items():
        path.write_text(json.dumps(arr, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if rejected:
        REJECTED.mkdir(parents=True, exist_ok=True)
        out = REJECTED / f"rejected_{date.today().isoformat()}.json"
        existing = json.loads(out.read_text(encoding="utf-8")) if out.exists() else []
        existing.extend(rejected)
        out.write_text(json.dumps(existing, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Rejected → {out} ({len(rejected)})")

    if args.export:
        for script in ("export_frontend.py", "export_translations.py"):
            subprocess.check_call([sys.executable, str(REPO / "scripts" / script)], cwd=REPO)
        print("Artefacts régénérés (frontend + translations)")


if __name__ == "__main__":
    main()
