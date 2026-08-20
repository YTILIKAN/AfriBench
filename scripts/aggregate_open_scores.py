#!/usr/bin/env python3
"""Agrège les scores des tâches non-QCM pour frontend / Space HF (issue #15).

Usage:
  python scripts/eval_open_tasks.py --dry-run
  python scripts/aggregate_open_scores.py
"""

from __future__ import annotations

import json
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DRY_RUN = REPO / "data" / "stats" / "open_tasks_dry_run.json"
OUT = REPO / "data" / "results" / "open_scores.json"
FRONTEND_OUT = REPO / "frontend" / "data" / "open_scores.json"


def aggregate(report: dict) -> dict:
    tasks = report.get("tasks") or {}
    summary = {"dry_run": report.get("dry_run", True), "tasks": {}, "models": []}
    for task, block in tasks.items():
        items = block.get("items") or []
        if not items:
            continue
        metric_keys = [k for k in items[0] if k not in {"id", "error"}]
        if not metric_keys:
            continue
        metric = metric_keys[0]
        vals = [it[metric] for it in items if isinstance(it.get(metric), (int, float))]
        avg = round(sum(vals) / len(vals), 4) if vals else None
        summary["tasks"][task] = {
            "n": len(items),
            "metric": metric,
            "average": avg,
            "items": items,
        }
    # Placeholder leaderboard (dry-run baseline — remplacer après eval modèles réels)
    summary["models"] = [
        {
            "model": "baseline-dry-run",
            "model_label": "Baseline (dry-run)",
            "task_averages": {t: info["average"] for t, info in summary["tasks"].items()},
        }
    ]
    return summary


def main() -> None:
    if not DRY_RUN.exists():
        raise SystemExit(f"Introuvable : {DRY_RUN} — lancer eval_open_tasks.py d'abord")
    report = json.loads(DRY_RUN.read_text(encoding="utf-8"))
    summary = aggregate(report)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    FRONTEND_OUT.parent.mkdir(parents=True, exist_ok=True)
    FRONTEND_OUT.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"→ {OUT}")
    print(f"→ {FRONTEND_OUT}")


if __name__ == "__main__":
    main()
