"""Tests seed versionné et manifest corpus."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from app.config import REPO_ROOT, get_settings
from app.repository import _seed_questions, update_question
from app.services.data_loader import load_questions_seed_version


@pytest.fixture(autouse=True)
def _clear_settings():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_load_questions_seed_version_from_manifest(tmp_path, monkeypatch):
    manifest = tmp_path / "manifest.json"
    manifest.write_text(json.dumps({"seed_version": 3}), encoding="utf-8")
    monkeypatch.setenv("AFRIBENCH_QUESTIONS_MANIFEST", str(manifest))
    get_settings.cache_clear()

    # Override via settings path directly
    settings = get_settings()
    monkeypatch.setattr(settings, "questions_manifest", manifest)
    assert load_questions_seed_version(settings) == 3


def test_load_questions_seed_version_defaults_to_one():
    settings = get_settings()
    assert load_questions_seed_version(settings) >= 1


def test_manifest_exists_in_repo():
    path = REPO_ROOT / "data" / "questions" / "v1" / "manifest.json"
    assert path.exists()
    data = json.loads(path.read_text(encoding="utf-8"))
    assert data["seed_version"] >= 1
    assert data["corpus"] == "v1"


def test_seed_questions_executes_upsert(monkeypatch):
    session = MagicMock()
    questions = [
        {
            "id": "HIST-001",
            "category": "histoire",
            "question": "Test?",
            "options": {"A": "a", "B": "b"},
            "answer": "A",
        }
    ]
    stats = _seed_questions(session, questions, seed_version=2)
    assert stats["processed"] == 1
    session.execute.assert_called_once()


def test_update_question_sets_locked_by_admin():
    session = MagicMock()
    q = MagicMock()
    q.locked_by_admin = False
    session.get.return_value = q

    update_question(session, "HIST-001", {"question": "Modifiée", "category": "histoire"})

    assert q.locked_by_admin is True
