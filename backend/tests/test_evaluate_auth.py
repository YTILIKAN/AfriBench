"""Tests auth, rate-limit et endpoint /evaluate."""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.security import rate_limiter


@pytest.fixture(autouse=True)
def _reset_settings(monkeypatch):
    get_settings.cache_clear()
    rate_limiter._hits.clear()
    yield
    get_settings.cache_clear()
    rate_limiter._hits.clear()


client = TestClient(app)


def test_evaluate_disabled_without_api_key(monkeypatch):
    monkeypatch.delenv("AFRIBENCH_API_KEY", raising=False)
    get_settings.cache_clear()
    r = client.post("/api/v1/evaluate", json={"model": "gpt-4o", "limit": 1})
    assert r.status_code == 503


def test_evaluate_rejects_bad_key(monkeypatch):
    monkeypatch.setenv("AFRIBENCH_API_KEY", "secret-test-key")
    get_settings.cache_clear()
    r = client.post(
        "/api/v1/evaluate",
        json={"model": "gpt-4o", "limit": 1},
        headers={"X-API-Key": "wrong"},
    )
    assert r.status_code == 401


def test_evaluate_queues_job(monkeypatch):
    monkeypatch.setenv("AFRIBENCH_API_KEY", "secret-test-key")
    get_settings.cache_clear()

    started = {}

    def fake_start(job_id, model, few_shot, limit, category):
        started["job_id"] = job_id
        started["model"] = model

    monkeypatch.setattr(
        "app.routers.v1.evalsvc.start_job_async",
        fake_start,
    )

    r = client.post(
        "/api/v1/evaluate",
        json={"model": "gpt-4o", "limit": 2, "few_shot": 0},
        headers={"X-API-Key": "secret-test-key"},
    )
    assert r.status_code == 202
    body = r.json()
    assert body["status"] == "queued"
    assert body["model"] == "gpt-4o"
    assert started["model"] == "gpt-4o"

    status = client.get(f"/api/v1/jobs/{body['job_id']}")
    assert status.status_code == 200
    assert status.json()["job_id"] == body["job_id"]


def test_reload_requires_key(monkeypatch):
    monkeypatch.setenv("AFRIBENCH_API_KEY", "secret-test-key")
    get_settings.cache_clear()
    assert client.post("/api/v1/reload").status_code == 401
    ok = client.post("/api/v1/reload", headers={"X-API-Key": "secret-test-key"})
    assert ok.status_code == 200
    assert ok.json()["reloaded"] is True


def test_rate_limit_triggers(monkeypatch):
    monkeypatch.setenv("AFRIBENCH_RATE_LIMIT_READ", "3")
    monkeypatch.setenv("AFRIBENCH_RATE_LIMIT_READ_WINDOW", "60")
    get_settings.cache_clear()

    codes = [client.get("/api/v1/health").status_code for _ in range(4)]
    assert codes[:3] == [200, 200, 200]
    assert codes[3] == 429
