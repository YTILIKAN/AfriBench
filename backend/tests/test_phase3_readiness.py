"""Phase 3 readiness: validators tooling, i18n pilots, non-QCM, metrics stubs."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]


def test_validation_batch_and_apply_dry_run(tmp_path: Path):
    batch = tmp_path / "batch.jsonl"
    subprocess.check_call(
        [
            sys.executable,
            str(REPO / "scripts" / "prepare_validation_batch.py"),
            "--size",
            "9",
            "--seed",
            "1",
            "--validator",
            "ci_validator",
            "--out",
            str(batch),
        ],
        cwd=REPO,
    )
    rows = [json.loads(l) for l in batch.read_text(encoding="utf-8").splitlines() if l.strip()]
    assert len(rows) == 9
    assert len({r["category"] for r in rows}) >= 3

    # Marquer ok pour dry-run apply
    reviewed = tmp_path / "reviewed.jsonl"
    with reviewed.open("w", encoding="utf-8") as f:
        for r in rows:
            r["verdict"] = "ok"
            r["date"] = "2026-08-03"
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    subprocess.check_call(
        [
            sys.executable,
            str(REPO / "scripts" / "apply_validations.py"),
            "--batch",
            str(reviewed),
            "--dry-run",
        ],
        cwd=REPO,
    )


def test_translation_pilots_all_langs():
    root = REPO / "data" / "questions" / "v1" / "translations"
    for lang in ("sw", "yo", "am"):
        pilot = json.loads((root / lang / "pilot_draft.json").read_text(encoding="utf-8"))
        assert len(pilot) >= 3
        assert all(p.get("translation_status") == "draft_mt_unverified" for p in pilot)


def test_export_translations(tmp_path: Path, monkeypatch):
    # Run export into repo default dir is gitignored; just ensure command works
    subprocess.check_call(
        [sys.executable, str(REPO / "scripts" / "export_translations.py")],
        cwd=REPO,
    )
    manifest = json.loads(
        (REPO / "data" / "translations_export" / "manifest.json").read_text(encoding="utf-8")
    )
    assert manifest["official"] is False
    assert manifest["langs"]["sw"]["total"] >= 3


def test_non_qcm_task_files():
    root = REPO / "data" / "questions" / "v1" / "open"
    expected = {
        "open_qa_v1.json": "open_qa",
        "ner_v1.json": "ner",
        "sentiment_v1.json": "sentiment",
        "translation_v1.json": "translation",
        "summarization_v1.json": "summarization",
    }
    for name, task in expected.items():
        items = json.loads((root / name).read_text(encoding="utf-8"))
        assert len(items) >= 3
        assert all(i.get("task_type") == task for i in items)


def test_text_metrics_stubs():
    sys.path.insert(0, str(REPO / "scripts"))
    from metrics.text_metrics import bleu_proxy, entity_f1, rouge_l_proxy, token_f1

    assert token_f1("Addis Ababa Ethiopia", "Addis Ababa") > 0.5
    assert rouge_l_proxy("le paludisme reste une menace", "le paludisme est une menace") > 0.5
    assert bleu_proxy("a b c", "a b d") > 0
    assert (
        entity_f1(
            [{"span": "Ghana", "label": "LOC"}],
            [{"span": "Ghana", "label": "LOC"}],
        )
        == 1.0
    )


def test_docs_exist():
    for rel in (
        "docs/VALIDATORS.md",
        "docs/VALIDATION_PROTOCOL.md",
        "docs/templates/validator_outreach.md",
        "research/08-soumission-academique.md",
        "CONTRIBUTING.md",
        "scripts/deploy_hf_space.sh",
    ):
        assert (REPO / rel).exists(), rel
