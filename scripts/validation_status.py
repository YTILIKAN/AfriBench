#!/usr/bin/env python3
"""Rapport de couverture validation externe (issue #5).

Usage:
  python scripts/validation_status.py
  python scripts/validation_status.py --json data/validation/status.json
  python scripts/validation_status.py --markdown docs/VALIDATION_STATUS.md
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
VALIDATED = REPO / "data" / "questions" / "v1" / "validated"


def load_questions() -> list[dict]:
    items: list[dict] = []
    for path in sorted(VALIDATED.glob("*.json")):
        if path.name == "template.json":
            continue
        items.extend(json.loads(path.read_text(encoding="utf-8")))
    return items


def build_report() -> dict:
    questions = load_questions()
    total = len(questions)
    validated = [q for q in questions if q.get("validated_by")]
    by_cat = Counter(q.get("category", "unknown") for q in questions)
    validated_by_cat = Counter(q.get("category", "unknown") for q in validated)
    per_cat = {
        cat: {
            "total": by_cat[cat],
            "validated": validated_by_cat.get(cat, 0),
            "pct": round(100 * validated_by_cat.get(cat, 0) / by_cat[cat], 1) if by_cat[cat] else 0,
        }
        for cat in sorted(by_cat)
    }
    pct = round(100 * len(validated) / total, 1) if total else 0.0
    return {
        "total_questions": total,
        "validated_count": len(validated),
        "validated_pct": pct,
        "target_validators": 3,
        "ready_for_recruitment": True,
        "by_category": per_cat,
        "validators_seen": sorted({q.get("validated_by") for q in validated if q.get("validated_by")}),
    }


def to_markdown(report: dict) -> str:
    lines = [
        "# Statut validation externe",
        "",
        f"- **Questions** : {report['total_questions']}",
        f"- **Validées** : {report['validated_count']} ({report['validated_pct']}%)",
        f"- **Validateurs cibles** : {report['target_validators']}",
        "",
        "## Par catégorie",
        "",
        "| Catégorie | Total | Validées | % |",
        "|-----------|------:|---------:|--:|",
    ]
    for cat, info in report["by_category"].items():
        lines.append(f"| {cat} | {info['total']} | {info['validated']} | {info['pct']}% |")
    if report["validators_seen"]:
        lines.extend(["", f"Validateurs enregistrés : {', '.join(report['validators_seen'])}"])
    lines.append("")
    lines.append(
        "Générer un batch : `python scripts/prepare_validation_batch.py --size 40 "
        "--validator validator_a --out data/validation/batch_01.jsonl`"
    )
    return "\n".join(lines) + "\n"


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--json", type=Path, help="Écrire le rapport JSON")
    p.add_argument("--markdown", type=Path, help="Écrire le rapport Markdown")
    args = p.parse_args()
    report = build_report()
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"→ {args.json}")
    if args.markdown:
        args.markdown.parent.mkdir(parents=True, exist_ok=True)
        args.markdown.write_text(to_markdown(report), encoding="utf-8")
        print(f"→ {args.markdown}")


if __name__ == "__main__":
    main()
