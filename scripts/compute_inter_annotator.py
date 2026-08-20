#!/usr/bin/env python3
"""Calcule Cohen's κ entre deux batches de validation (double annotation).

Usage:
  python scripts/compute_inter_annotator.py \\
    --batch-a data/validation/batch_a_reviewed.jsonl \\
    --batch-b data/validation/batch_b_reviewed.jsonl
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def load_verdicts(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        verdict = (row.get("verdict") or "").strip().lower()
        if verdict:
            out[row["id"]] = verdict
    return out


def cohens_kappa(a: dict[str, str], b: dict[str, str]) -> tuple[float, int, list[str]]:
    common = sorted(set(a) & set(b))
    if not common:
        return 0.0, 0, []
    labels = sorted({a[i] for i in common} | {b[i] for i in common})
    n = len(common)
    agree = sum(1 for i in common if a[i] == b[i])
    po = agree / n
    pa = {lab: sum(1 for i in common if a[i] == lab) / n for lab in labels}
    pb = {lab: sum(1 for i in common if b[i] == lab) / n for lab in labels}
    pe = sum(pa[lab] * pb[lab] for lab in labels)
    kappa = 1.0 if pe == 1.0 else (po - pe) / (1 - pe)
    disagreements = [i for i in common if a[i] != b[i]]
    return round(kappa, 4), n, disagreements


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--batch-a", type=Path, required=True)
    p.add_argument("--batch-b", type=Path, required=True)
    p.add_argument("--out", type=Path, default=None)
    args = p.parse_args()
    va = load_verdicts(args.batch_a)
    vb = load_verdicts(args.batch_b)
    kappa, n, disagreements = cohens_kappa(va, vb)
    report = {
        "cohens_kappa": kappa,
        "n_overlap": n,
        "disagreements": disagreements[:50],
        "disagreement_count": len(disagreements),
        "batch_a": str(args.batch_a),
        "batch_b": str(args.batch_b),
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
