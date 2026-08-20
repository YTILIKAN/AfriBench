"""Tests jobs persistants et rate-limit Postgres (mockés)."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.config import get_settings
from app.rate_limit import MemoryRateLimitBackend, PostgresRateLimitBackend, RateLimiter
from app.services import evaluate as evalsvc


@pytest.fixture(autouse=True)
def _clear_settings():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_create_job_uses_repository_when_db_enabled(monkeypatch):
    monkeypatch.setenv("AFRIBENCH_DATABASE_URL", "postgresql://test:test@localhost/test")
    get_settings.cache_clear()

    fake_job = {
        "job_id": "abc123",
        "status": "queued",
        "model": "gpt-4o",
        "few_shot": 0,
        "limit": 2,
        "category": None,
        "created_at": "2026-01-01T00:00:00+00:00",
        "started_at": None,
        "finished_at": None,
        "error": None,
        "result_summary": None,
        "result_path": None,
    }

    with patch("app.repository.create_job", return_value=fake_job) as create_mock:
        job = evalsvc.create_job("gpt-4o", 0, 2, None)

    create_mock.assert_called_once()
    assert job["job_id"] == "abc123"
    assert job["status"] == "queued"


def test_get_job_falls_back_to_memory_without_db():
    job = evalsvc.create_job("gpt-4o", 0, 1, None)
    loaded = evalsvc.get_job(job["job_id"])
    assert loaded is not None
    assert loaded["job_id"] == job["job_id"]


def test_memory_rate_limit_blocks_after_limit():
    backend = MemoryRateLimitBackend()
    for _ in range(3):
        ok, _ = backend.check("test-key", 3, 60.0)
        assert ok is True
    ok, retry = backend.check("test-key", 3, 60.0)
    assert ok is False
    assert retry >= 1


def test_postgres_rate_limit_inserts_hit(monkeypatch):
    session = MagicMock()
    session.scalar.side_effect = [0, None]
    monkeypatch.setattr("app.db.get_session", lambda: session)

    backend = PostgresRateLimitBackend()
    ok, retry = backend.check("ip:/health", 10, 60.0)

    assert ok is True
    assert retry == 0
    session.add.assert_called_once()
    session.commit.assert_called()


def test_rate_limiter_auto_selects_memory_without_db():
    limiter = RateLimiter()
    ok, _ = limiter.check("k", 5, 60.0)
    assert ok is True


def test_runner_lock_fails_second_job(monkeypatch):
    monkeypatch.delenv("AFRIBENCH_DATABASE_URL", raising=False)
    get_settings.cache_clear()

    updates: list[tuple[str, dict]] = []

    def capture_update(job_id, **kwargs):
        updates.append((job_id, kwargs))

    monkeypatch.setattr(evalsvc, "_update_job", capture_update)

    lock = evalsvc._runner_lock
    lock.acquire()

    try:
        evalsvc.run_evaluation("job1", "gpt-4o", 0, 1, None)
    finally:
        lock.release()

    failed = [u for u in updates if u[1].get("status") == "failed"]
    assert failed
    assert "déjà en cours" in failed[0][1]["error"]
