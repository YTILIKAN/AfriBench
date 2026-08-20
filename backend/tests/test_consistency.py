"""Guards against silent corpus / results / export drift."""

from __future__ import annotations

import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]


def _count_validated() -> int:
    validated = REPO / "data" / "questions" / "v1" / "validated"
    n = 0
    for p in validated.glob("*.json"):
        n += len(json.loads(p.read_text(encoding="utf-8")))
    return n


def test_frontend_questions_match_validated():
    validated_n = _count_validated()
    frontend = json.loads(
        (REPO / "frontend" / "data" / "questions.json").read_text(encoding="utf-8")
    )
    assert len(frontend) == validated_n
    assert validated_n >= 350


def test_lm_eval_manifest_matches_validated():
    validated_n = _count_validated()
    manifest = json.loads(
        (REPO / "data" / "lm_eval" / "manifest.json").read_text(encoding="utf-8")
    )
    assert manifest.get("total") == validated_n


def test_seed_results_totals_are_labeled():
    """Public results may still be 101-seed; generator must not pretend they are full-corpus."""
    results = json.loads(
        (REPO / "frontend" / "data" / "results.json").read_text(encoding="utf-8")
    )
    qn = len(
        json.loads((REPO / "frontend" / "data" / "questions.json").read_text(encoding="utf-8"))
    )
    totals = {r.get("total") for r in results if isinstance(r.get("total"), int)}
    if totals and totals != {qn}:
        # Static HTML note is regenerated from generate_static_html.py — assert seed mismatch is visible
        html = (REPO / "frontend" / "index.html").read_text(encoding="utf-8")
        assert "seed" in html.lower() or "sous-ensemble" in html.lower() or str(
            next(iter(totals))
        ) in html
