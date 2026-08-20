#!/usr/bin/env python3
"""Évalue les tâches non-QCM en mode dry-run (réponses = références / proxies).

Usage:
  python scripts/eval_open_tasks.py --dry-run
  python scripts/eval_open_tasks.py --dry-run --tasks translation,summarization,open_qa,ner,sentiment
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OPEN_DIR = REPO / "data" / "questions" / "v1" / "open"
sys.path.insert(0, str(REPO / "scripts"))
from metrics.text_metrics import bleu_proxy, entity_f1, rouge_l_proxy, token_f1  # noqa: E402

TASK_FILES = {
    "open_generation": "open_v1.json",
    "open_qa": "open_qa_v1.json",
    "translation": "translation_v1.json",
    "summarization": "summarization_v1.json",
    "ner": "ner_v1.json",
    "sentiment": "sentiment_v1.json",
}


def load_task(task: str) -> list[dict]:
    path = OPEN_DIR / TASK_FILES[task]
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def score_item(task: str, item: dict) -> dict:
    if task == "translation":
        ref = item.get("reference_translation") or ""
        # dry-run : prédire la référence (score parfait attendu)
        pred = ref
        return {"id": item["id"], "bleu_proxy": round(bleu_proxy(pred, ref), 4)}
    if task == "summarization":
        # proxy : joindre les reference_points comme "résumé idéal"
        ref = " ".join(item.get("reference_points") or [])
        pred = ref
        return {"id": item["id"], "rouge_l_proxy": round(rouge_l_proxy(pred, ref), 4)}
    if task == "open_qa":
        refs = item.get("reference_answers") or []
        pred = refs[0] if refs else ""
        scores = [token_f1(pred, r) for r in refs] or [0.0]
        return {"id": item["id"], "token_f1": round(max(scores), 4)}
    if task == "ner":
        gold = item.get("entities") or []
        return {"id": item["id"], "entity_f1": round(entity_f1(gold, gold), 4)}
    if task == "sentiment":
        label = item.get("label")
        return {"id": item["id"], "accuracy": 1.0 if label else 0.0}
    if task == "open_generation":
        # dry-run : présence de rubrique seulement
        return {
            "id": item["id"],
            "rubric_ready": bool(item.get("rubric") and item.get("reference_points")),
        }
    return {"id": item.get("id"), "error": "unknown_task"}


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dry-run", action="store_true", default=True)
    p.add_argument(
        "--tasks",
        default="open_generation,open_qa,translation,summarization,ner,sentiment",
    )
    p.add_argument("--out", type=Path, default=REPO / "data" / "stats" / "open_tasks_dry_run.json")
    args = p.parse_args()
    tasks = [t.strip() for t in args.tasks.split(",") if t.strip()]
    report = {"dry_run": True, "tasks": {}}
    for task in tasks:
        if task not in TASK_FILES:
            raise SystemExit(f"Tâche inconnue: {task}")
        items = load_task(task)
        rows = [score_item(task, it) for it in items]
        report["tasks"][task] = {"n": len(rows), "items": rows}
        print(f"{task}: {len(rows)} items")
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"→ {args.out}")


if __name__ == "__main__":
    main()
