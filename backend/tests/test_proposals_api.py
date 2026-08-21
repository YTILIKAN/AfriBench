"""Contrat API du hub communautaire."""

from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.main import app
from app.routers import v1


class FakeSession:
    def commit(self):
        return None

    def rollback(self):
        return None

    def refresh(self, _instance):
        return None


def _override_db():
    yield FakeSession()


def _proposal_payload():
    return {
        "category": "histoire",
        "difficulty": "medium",
        "question": "Quel empire avait Tombouctou comme grand centre intellectuel ?",
        "options": {
            "A": "Empire du Mali",
            "B": "Empire romain",
            "C": "Empire ottoman",
            "D": "Empire inca",
        },
        "answer": "A",
        "explanation": "Tombouctou fut un centre majeur de l'Empire du Mali.",
        "source": "https://whc.unesco.org/fr/list/119/",
        "author": "Awa",
    }


def test_list_proposals_exposes_public_vote_counts(monkeypatch):
    expected = [{"id": "p1", "score": 2, "upvotes": 3, "downvotes": 1}]
    monkeypatch.setattr(v1.repository, "list_proposals", lambda *args, **kwargs: expected)
    app.dependency_overrides[v1.proposal_db] = _override_db
    try:
        response = TestClient(app).get(
            "/api/v1/proposals",
            headers={"X-Voter-ID": "visitor-token-123456"},
        )
        assert response.status_code == 200
        assert response.json() == expected
    finally:
        app.dependency_overrides.clear()


def test_create_proposal_validates_four_options(monkeypatch):
    proposal = SimpleNamespace(id="p1")
    result = {**_proposal_payload(), "id": "p1", "score": 0}
    monkeypatch.setattr(v1.repository, "find_duplicate_proposal", lambda *args: None)
    monkeypatch.setattr(v1.repository, "create_proposal", lambda *args: proposal)
    monkeypatch.setattr(v1.repository, "proposal_to_dict", lambda *args: result)
    app.dependency_overrides[v1.proposal_db] = _override_db
    try:
        client = TestClient(app)
        response = client.post("/api/v1/proposals", json=_proposal_payload())
        assert response.status_code == 201
        assert response.json()["id"] == "p1"

        invalid = _proposal_payload()
        invalid["options"] = {"A": "Oui", "B": "Non"}
        assert client.post("/api/v1/proposals", json=invalid).status_code == 422
    finally:
        app.dependency_overrides.clear()


def test_vote_is_anonymous_and_modifiable(monkeypatch):
    proposal = SimpleNamespace(id="p1")
    result = {"id": "p1", "score": 1, "user_vote": 1}
    monkeypatch.setattr(v1.repository, "cast_proposal_vote", lambda *args: proposal)
    monkeypatch.setattr(v1.repository, "proposal_to_dict", lambda *args: result)
    app.dependency_overrides[v1.proposal_db] = _override_db
    try:
        response = TestClient(app).post(
            "/api/v1/proposals/p1/vote",
            json={"value": 1, "voter_id": "visitor-token-123456"},
        )
        assert response.status_code == 200
        assert response.json()["user_vote"] == 1
    finally:
        app.dependency_overrides.clear()
