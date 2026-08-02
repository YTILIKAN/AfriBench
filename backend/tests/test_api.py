"""Tests smoke de l'API AfriBench."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root():
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["service"] == "afribench-backend"


def test_health():
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_questions():
    r = client.get("/api/v1/questions", params={"limit": 500})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 100
    assert "id" in data[0] and "options" in data[0]


def test_questions_filter():
    r = client.get("/api/v1/questions", params={"category": "histoire", "difficulty": "hard"})
    assert r.status_code == 200
    for q in r.json():
        assert q["category"] == "histoire"
        assert q["difficulty"] == "hard"


def test_results():
    r = client.get("/api/v1/results", params={"limit": 100})
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1
    assert "accuracy" in data[0]
    assert "details" not in data[0]


def test_models_and_stats_and_leaderboard():
    models = client.get("/api/v1/models").json()
    stats = client.get("/api/v1/stats").json()
    lb = client.get("/api/v1/leaderboard").json()
    assert len(models) >= 1
    assert stats["total_questions"] >= 100
    assert stats["total_models"] == len(models)
    assert "models" in lb and "category_averages" in lb
