"""Tests scripts validation_status + compute_inter_annotator."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]


def test_validation_status_json():
    out = subprocess.check_output(
        [sys.executable, str(REPO / "scripts" / "validation_status.py")],
        cwd=REPO,
        text=True,
    )
    report = json.loads(out)
    assert report["total_questions"] >= 300
    assert report["target_validators"] == 3


def test_cohens_kappa_perfect_agreement(tmp_path: Path):
    batch = tmp_path / "a.jsonl"
    batch.write_text(
        '\n'.join(
            json.dumps({"id": f"Q{i}", "verdict": "ok"}) for i in range(5)
        )
        + "\n",
        encoding="utf-8",
    )
    out = subprocess.check_output(
        [
            sys.executable,
            str(REPO / "scripts" / "compute_inter_annotator.py"),
            "--batch-a",
            str(batch),
            "--batch-b",
            str(batch),
        ],
        cwd=REPO,
        text=True,
    )
    report = json.loads(out)
    assert report["cohens_kappa"] == 1.0
    assert report["n_overlap"] == 5


def test_prepare_translation_batch(tmp_path: Path):
    out = tmp_path / "tr.jsonl"
    subprocess.check_call(
        [
            sys.executable,
            str(REPO / "scripts" / "prepare_translation_batch.py"),
            "--lang",
            "sw",
            "--size",
            "5",
            "--out",
            str(out),
        ],
        cwd=REPO,
    )
    rows = [json.loads(l) for l in out.read_text(encoding="utf-8").splitlines() if l.strip()]
    assert len(rows) == 5
    assert all(r["target_language"] == "sw" for r in rows)
