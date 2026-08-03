"""Tests stats_analysis + eval_open_tasks."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]


def test_stats_analysis_on_seed(tmp_path: Path):
    out = tmp_path / "report.json"
    subprocess.check_call(
        [
            sys.executable,
            str(REPO / "scripts" / "stats_analysis.py"),
            "--results",
            str(REPO / "data" / "results" / "_seed_v0.1.json"),
            "--n-boot",
            "200",
            "--out",
            str(out),
        ],
        cwd=REPO,
    )
    report = json.loads(out.read_text(encoding="utf-8"))
    assert report["n_models"] >= 5
    assert "top_comparison" in report
    assert report["mcnemar_pairs"]


def test_eval_open_tasks_dry_run(tmp_path: Path):
    out = tmp_path / "open.json"
    subprocess.check_call(
        [
            sys.executable,
            str(REPO / "scripts" / "eval_open_tasks.py"),
            "--out",
            str(out),
        ],
        cwd=REPO,
    )
    report = json.loads(out.read_text(encoding="utf-8"))
    assert report["dry_run"] is True
    assert report["tasks"]["translation"]["n"] >= 3
    assert report["tasks"]["ner"]["items"][0]["entity_f1"] == 1.0


def test_space_stats_seed_mismatch():
    try:
        import pandas  # noqa: F401
    except ImportError:
        return
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "hf_space_utils2", REPO / "hf_space" / "utils.py"
    )
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    stats = mod.stats_summary()
    assert stats.get("corpus_questions") == 350
    assert stats.get("seed_mismatch") is True
