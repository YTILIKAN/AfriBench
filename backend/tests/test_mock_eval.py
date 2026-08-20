"""Tests for deterministic mock QCM evaluation (no API keys)."""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SCRIPT = REPO / "scripts" / "afribench.py"


def _load_afribench():
    spec = importlib.util.spec_from_file_location("afribench_cli", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules["afribench_cli"] = mod
    spec.loader.exec_module(mod)
    return mod


def test_mock_eval_is_deterministic():
    ab = _load_afribench()
    questions = ab.load_questions("v1")[:40]
    model = {"name": "mock-model", "label": "Mock Model", "provider": "openai"}
    a = ab.evaluate_model(model, questions, mock=True)
    b = ab.evaluate_model(model, questions, mock=True)
    assert a["total"] == 40
    assert a["mock"] is True
    assert a["correct"] + a["incorrect"] + a["no_answer"] == a["total"]
    assert a["accuracy"] == b["accuracy"]
    assert [d["got"] for d in a["details"]] == [d["got"] for d in b["details"]]


def test_mock_different_models_differ():
    ab = _load_afribench()
    questions = ab.load_questions("v1")[:60]
    m1 = {"name": "alpha", "label": "Alpha", "provider": "openai"}
    m2 = {"name": "omega", "label": "Omega", "provider": "openai"}
    r1 = ab.evaluate_model(m1, questions, mock=True)
    r2 = ab.evaluate_model(m2, questions, mock=True)
    # Same pipeline, different seeds → scores or answer vectors differ
    assert r1["accuracy"] != r2["accuracy"] or [
        d["got"] for d in r1["details"]
    ] != [d["got"] for d in r2["details"]]


def test_mock_results_saved_under_mock_dir(tmp_path, monkeypatch):
    ab = _load_afribench()
    monkeypatch.setattr(ab, "RESULTS_DIR", tmp_path)
    questions = ab.load_questions("v1")[:5]
    model = {"name": "mock-model", "label": "Mock", "provider": "openai"}
    results = ab.evaluate_model(model, questions, mock=True)
    path = ab.save_results(results)
    assert path.parent.name == "mock"
    assert path.name.startswith("mock_")
    assert not list(tmp_path.glob("*.json"))
    assert ab.load_all_results() == []
    loaded = ab.load_all_results(include_mock=True)
    assert len(loaded) == 1
    assert loaded[0]["mock"] is True
