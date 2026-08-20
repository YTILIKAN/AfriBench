#!/usr/bin/env python3
"""Vérifie l'état de préparation soumission académique (issue #16).

Usage:
  python scripts/submission_readiness.py
  python scripts/submission_readiness.py --update-checklist
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CHECKLIST = REPO / "research" / "08-soumission-academique.md"


def run_validation_status() -> dict:
    out = subprocess.check_output(
        [sys.executable, str(REPO / "scripts" / "validation_status.py")],
        cwd=REPO,
        text=True,
    )
    return json.loads(out)


def count_translations() -> dict:
    root = REPO / "data" / "questions" / "v1" / "translations"
    langs = {}
    for lang in ("sw", "yo", "am"):
        items: list[dict] = []
        folder = root / lang
        if folder.exists():
            for path in folder.glob("*.json"):
                items.extend(json.loads(path.read_text(encoding="utf-8")))
        verified = sum(1 for q in items if q.get("translation_status") == "verified")
        langs[lang] = {"total": len(items), "verified": verified}
    return langs


def count_models() -> int:
    results_path = REPO / "frontend" / "data" / "results.json"
    if not results_path.exists():
        return 0
    data = json.loads(results_path.read_text(encoding="utf-8"))
    models = {r.get("model") or r.get("model_label") for r in data if isinstance(r, dict)}
    return len([m for m in models if m])


def open_tasks_ready() -> bool:
    p = REPO / "data" / "results" / "open_scores.json"
    return p.exists()


def hf_space_ready() -> bool:
    return (REPO / "hf_space" / "app.py").exists() and (REPO / "scripts" / "deploy_hf_space.sh").exists()


def build_report() -> dict:
    validation = run_validation_status()
    translations = count_translations()
    return {
        "questions_350": validation["total_questions"] >= 300,
        "validation_pct": validation["validated_pct"],
        "validation_ready": validation["validated_pct"] >= 10,
        "translations": translations,
        "multilingual_ready": any(t["verified"] >= 3 for t in translations.values()),
        "models_evaluated": count_models(),
        "models_target_met": count_models() >= 7,
        "open_tasks_pipeline": open_tasks_ready(),
        "hf_space_code": hf_space_ready(),
        "paper_draft": (REPO / "research" / "paper-draft.md").exists(),
        "citation_cff": (REPO / "CITATION.cff").exists(),
        "dataset_card": (REPO / "data" / "DATASET_CARD.md").exists(),
        "reproduce_script": (REPO / "scripts" / "reproduce.sh").exists(),
    }


def update_checklist(report: dict) -> None:
    if not CHECKLIST.exists():
        return
    text = CHECKLIST.read_text(encoding="utf-8")
    marker = "## État auto-généré"
    block = f"""## État auto-généré

_Dernière mise à jour : `submission_readiness.py`_

| Critère | État |
|---------|------|
| 300+ questions | {'✅' if report['questions_350'] else '❌'} |
| Validation externe | {'✅' if report['validation_ready'] else f"🟡 {report['validation_pct']}%"} |
| Multilingue SW/YO/AM | {'✅' if report['multilingual_ready'] else '🟡 pilotes'} |
| Modèles évalués | {'✅' if report['models_target_met'] else '🟡'} ({report['models_evaluated']}) |
| Tâches ouvertes | {'✅' if report['open_tasks_pipeline'] else '❌'} |
| Space HF (code) | {'✅' if report['hf_space_code'] else '❌'} |
| Brouillon papier | {'✅' if report['paper_draft'] else '❌'} |
| CITATION.cff | {'✅' if report['citation_cff'] else '❌'} |
"""
    if marker in text:
        head, _ = text.split(marker, 1)
        rest = _.split("\n## ", 1)
        tail = ("\n## " + rest[1]) if len(rest) > 1 else ""
        text = head.rstrip() + "\n\n" + block.rstrip() + tail
    else:
        text = text.rstrip() + "\n\n" + block
    CHECKLIST.write_text(text, encoding="utf-8")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--update-checklist", action="store_true")
    args = p.parse_args()
    report = build_report()
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if args.update_checklist:
        update_checklist(report)
        print(f"Checklist mise à jour → {CHECKLIST}")


if __name__ == "__main__":
    main()
