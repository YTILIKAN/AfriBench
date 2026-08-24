"""Tests smoke des scripts d'export (HF, questions, witness)."""

from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]


def test_witness_and_african_counts():
    validated = REPO / "data" / "questions" / "v1" / "validated"
    witness = REPO / "data" / "questions" / "v1" / "witness" / "temoin.json"
    african = 0
    for p in validated.glob("*.json"):
        african += len(json.loads(p.read_text(encoding="utf-8")))
    control = len(json.loads(witness.read_text(encoding="utf-8")))
    assert african >= 125
    assert control == 20
    assert all(q.get("is_control") for q in json.loads(witness.read_text(encoding="utf-8")))


def test_hf_export_script(tmp_path):
    # --out dirige l'export vers un dossier temporaire : sans cela, le test
    # réécrivait data/DATASET_CARD.md et data/hf/.../README.md à chaque
    # exécution, salissant l'arbre Git et interdisant un `git diff --exit-code`.
    script = REPO / "scripts" / "export_hf_dataset.py"
    out = tmp_path / "hf"
    subprocess.check_call([sys.executable, str(script), "--out", str(out)], cwd=REPO)
    african_lines = (out / "african.jsonl").read_text(encoding="utf-8").strip().splitlines()
    control_lines = (out / "control.jsonl").read_text(encoding="utf-8").strip().splitlines()
    assert len(african_lines) >= 125
    assert len(control_lines) == 20
    row = json.loads(african_lines[0])
    assert {"id", "question", "answer", "option_a", "is_control"} <= set(row)
    assert (out / "README.md").exists()
    # La carte canonique reste versionnée dans le dépôt, régénérée hors tests.
    assert (REPO / "data" / "DATASET_CARD.md").exists()


def test_afribench_load_witness():
    path = REPO / "scripts" / "afribench.py"
    spec = importlib.util.spec_from_file_location("afribench_cli", path)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    qs = mod.load_questions("witness")
    assert len(qs) == 20
    assert qs[0]["id"].startswith("CTRL-")
