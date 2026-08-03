"""Smoke tests pour les utilitaires lm-eval AfriBench."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
UTILS = REPO / "scripts" / "lm_eval_tasks" / "afribench" / "utils.py"
DATASET = REPO / "data" / "lm_eval" / "afribench.json"


def _load_utils():
    spec = importlib.util.spec_from_file_location("afribench_lm_utils", UTILS)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


def test_lm_eval_dataset_exists():
    assert DATASET.exists(), "Lancer: python scripts/export_lm_eval_dataset.py"
    data = json.loads(DATASET.read_text(encoding="utf-8"))
    assert len(data) >= 100


def test_doc_helpers():
    utils = _load_utils()
    data = json.loads(DATASET.read_text(encoding="utf-8"))
    doc = data[0]
    text = utils.doc_to_text(doc)
    choices = utils.doc_to_choice(doc)
    target = utils.doc_to_target(doc)
    assert "Question" in text
    assert choices == ["A", "B", "C", "D"]
    assert isinstance(target, int)
    assert 0 <= target < len(choices)
    assert choices[target] == doc["answer"]


def test_category_yamls_exist():
    root = REPO / "scripts" / "lm_eval_tasks" / "afribench"
    assert (root / "afribench.yaml").exists()
    assert (root / "afribench_all.yaml").exists()
    assert (root / "afribench_histoire.yaml").exists()
