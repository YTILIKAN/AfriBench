"""Tests API validation, translations, open tasks (issues #5, #14, #15)."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_validation_status_endpoint():
    r = client.get("/api/v1/validation/status")
    assert r.status_code == 200
    data = r.json()
    assert "total_questions" in data
    assert data["total_questions"] >= 300
    assert "validated_pct" in data


def test_translations_manifest():
    r = client.get("/api/v1/translations/manifest")
    assert r.status_code == 200
    data = r.json()
    assert "langs" in data
    assert set(data["langs"]) >= {"sw", "yo", "am"}


def test_translations_list_sw():
    r = client.get("/api/v1/translations?lang=sw&limit=10")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_open_tasks_endpoint():
    r = client.get("/api/v1/open/tasks?limit=10")
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 3


def test_open_scores_endpoint():
    r = client.get("/api/v1/open/scores")
    assert r.status_code == 200
    data = r.json()
    assert "tasks" in data


def test_stats_extended():
    r = client.get("/api/v1/stats")
    assert r.status_code == 200
    data = r.json()
    assert "validation_coverage" in data
    assert "translations" in data
    assert "open_tasks" in data
