"""Tests questions ouvertes + scaffolding i18n."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]


def test_open_questions_schema():
    path = REPO / "data" / "questions" / "v1" / "open" / "open_v1.json"
    items = json.loads(path.read_text(encoding="utf-8"))
    assert len(items) == 10
    for q in items:
        assert q["format"] == "open"
        assert "reference_points" in q and len(q["reference_points"]) >= 3
        assert set(q["rubric"]) >= {"exactitude", "profondeur", "nuance_culturelle"}
        assert q["max_score"] == 10


def test_translation_and_summarization_pilots():
    root = REPO / "data" / "questions" / "v1" / "open"
    tr = json.loads((root / "translation_v1.json").read_text(encoding="utf-8"))
    sm = json.loads((root / "summarization_v1.json").read_text(encoding="utf-8"))
    assert len(tr) >= 3
    assert len(sm) >= 3
    assert all(q["task_type"] == "translation" and q["format"] == "open" for q in tr)
    assert all(q["task_type"] == "summarization" and "source_text" in q for q in sm)
    assert all("reference_points" in q and "rubric" in q for q in tr + sm)


def test_judge_dry_run(tmp_path: Path):
    responses = tmp_path / "resp.jsonl"
    out = tmp_path / "out.jsonl"
    responses.write_text(
        json.dumps(
            {"id": "OPEN-001", "model": "dummy", "response": "La conférence de Berlin..."},
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    subprocess.check_call(
        [
            sys.executable,
            str(REPO / "scripts" / "judges" / "llm_as_judge.py"),
            "--responses",
            str(responses),
            "--out",
            str(out),
            "--dry-run",
        ],
        cwd=REPO,
    )
    row = json.loads(out.read_text(encoding="utf-8").strip())
    assert row["id"] == "OPEN-001"
    assert "scores" in row


def test_translation_scaffolding():
    root = REPO / "data" / "questions" / "v1" / "translations"
    for lang in ("sw", "yo", "am"):
        assert (root / lang / "STATUS.md").exists()
    pilot = json.loads((root / "sw" / "pilot_draft.json").read_text(encoding="utf-8"))
    assert len(pilot) >= 3
    assert all(p.get("translation_status") == "draft_mt_unverified" for p in pilot)


def test_african_question_count_floor():
    validated = REPO / "data" / "questions" / "v1" / "validated"
    n = 0
    for p in validated.glob("*.json"):
        n += len(json.loads(p.read_text(encoding="utf-8")))
    assert n >= 300
