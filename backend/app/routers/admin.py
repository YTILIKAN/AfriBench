"""Endpoints backoffice (CRUD + évaluation) — protégés par session admin."""

from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import repository as repo
from app.admin_auth import issue_token, require_admin, verify_admin_password
from app.config import Settings, get_settings
from app.db import get_db
from app.services import evaluate as evalsvc

router = APIRouter(prefix="/admin", tags=["admin"])


class LoginIn(BaseModel):
    password: str = Field(..., min_length=1)


class LoginOut(BaseModel):
    token: str
    expires_in: int


class ProposalStatusIn(BaseModel):
    status: Literal["pending", "accepted", "rejected"]


@router.post("/login", response_model=LoginOut)
def login(body: LoginIn, settings: Settings = Depends(get_settings)) -> LoginOut:
    if not verify_admin_password(body.password, settings):
        raise HTTPException(status_code=401, detail="Mot de passe incorrect.")
    return LoginOut(token=issue_token(settings), expires_in=settings.admin_session_ttl)


# ── Questions ────────────────────────────────────────────────────────────

@router.get("/questions", dependencies=[Depends(require_admin)])
def admin_list_questions() -> list[dict[str, Any]]:
    return repo.list_questions()


@router.post(
    "/questions",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def admin_create_question(
    body: dict[str, Any], session: Session = Depends(get_db)
) -> dict[str, Any]:
    if not body.get("id"):
        raise HTTPException(status_code=422, detail="Le champ 'id' est obligatoire.")
    if repo.get_question(session, body["id"]):
        raise HTTPException(status_code=409, detail=f"La question '{body['id']}' existe déjà.")
    q = repo.create_question(session, body)
    session.commit()
    return repo.question_to_dict(q)


@router.put("/questions/{qid}", dependencies=[Depends(require_admin)])
def admin_update_question(
    qid: str, body: dict[str, Any], session: Session = Depends(get_db)
) -> dict[str, Any]:
    q = repo.update_question(session, qid, body)
    if q is None:
        raise HTTPException(status_code=404, detail="Question introuvable.")
    session.commit()
    return repo.question_to_dict(q)


@router.delete("/questions/{qid}", dependencies=[Depends(require_admin)])
def admin_delete_question(
    qid: str, session: Session = Depends(get_db)
) -> dict[str, Any]:
    if not repo.delete_question(session, qid):
        raise HTTPException(status_code=404, detail="Question introuvable.")
    session.commit()
    return {"deleted": True, "id": qid}


# ── Propositions communautaires ─────────────────────────────────────────

@router.get("/proposals", dependencies=[Depends(require_admin)])
def admin_list_proposals(
    proposal_status: str = Query("pending", alias="status"),
    session: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    return repo.list_proposals(session, status=proposal_status, sort="popular")


@router.put("/proposals/{proposal_id}/status", dependencies=[Depends(require_admin)])
def admin_update_proposal_status(
    proposal_id: str,
    body: ProposalStatusIn,
    session: Session = Depends(get_db),
) -> dict[str, Any]:
    proposal = repo.update_proposal_status(session, proposal_id, body.status)
    if proposal is None:
        raise HTTPException(status_code=404, detail="Proposition introuvable.")
    session.commit()
    return repo.proposal_to_dict(session, proposal)


# ── Résultats ────────────────────────────────────────────────────────────

@router.get("/results", dependencies=[Depends(require_admin)])
def admin_list_results() -> list[dict[str, Any]]:
    return repo.list_results()


@router.post(
    "/results",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def admin_create_result(
    body: dict[str, Any], session: Session = Depends(get_db)
) -> dict[str, Any]:
    if not body.get("model"):
        raise HTTPException(status_code=422, detail="Le champ 'model' est obligatoire.")
    r = repo.create_result(session, body)
    session.commit()
    return repo.result_to_dict(r)


@router.put("/results/{rid}", dependencies=[Depends(require_admin)])
def admin_update_result(
    rid: int, body: dict[str, Any], session: Session = Depends(get_db)
) -> dict[str, Any]:
    r = repo.update_result(session, rid, body)
    if r is None:
        raise HTTPException(status_code=404, detail="Résultat introuvable.")
    session.commit()
    return repo.result_to_dict(r)


@router.delete("/results/{rid}", dependencies=[Depends(require_admin)])
def admin_delete_result(
    rid: int, session: Session = Depends(get_db)
) -> dict[str, Any]:
    if not repo.delete_result(session, rid):
        raise HTTPException(status_code=404, detail="Résultat introuvable.")
    session.commit()
    return {"deleted": True, "id": rid}


# ── Modèles (config évaluation) ──────────────────────────────────────────

@router.get("/models", dependencies=[Depends(require_admin)])
def admin_list_models() -> list[dict[str, Any]]:
    return repo.list_models()


@router.post(
    "/models",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def admin_create_model(
    body: dict[str, Any], session: Session = Depends(get_db)
) -> dict[str, Any]:
    if not body.get("name"):
        raise HTTPException(status_code=422, detail="Le champ 'name' est obligatoire.")
    if repo.get_model(session, body["name"]):
        raise HTTPException(status_code=409, detail=f"Le modèle '{body['name']}' existe déjà.")
    m = repo.create_model(session, body)
    session.commit()
    return repo.model_to_dict(m)


@router.put("/models/{name}", dependencies=[Depends(require_admin)])
def admin_update_model(
    name: str, body: dict[str, Any], session: Session = Depends(get_db)
) -> dict[str, Any]:
    m = repo.update_model(session, name, body)
    if m is None:
        raise HTTPException(status_code=404, detail="Modèle introuvable.")
    session.commit()
    return repo.model_to_dict(m)


@router.delete("/models/{name}", dependencies=[Depends(require_admin)])
def admin_delete_model(
    name: str, session: Session = Depends(get_db)
) -> dict[str, Any]:
    if not repo.delete_model(session, name):
        raise HTTPException(status_code=404, detail="Modèle introuvable.")
    session.commit()
    return {"deleted": True, "name": name}


# ── Évaluation ───────────────────────────────────────────────────────────

class EvaluateIn(BaseModel):
    model: str = Field(..., description="Nom du modèle (tel qu'enregistré)")
    few_shot: int = Field(0, ge=0, le=10)
    limit: int | None = Field(None, ge=1, le=500, description="Limiter le nombre de questions")
    category: str | None = Field(None, description="Évaluer une seule catégorie")


@router.post(
    "/evaluate",
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(require_admin)],
)
def admin_evaluate(body: EvaluateIn) -> dict[str, Any]:
    """Lance une évaluation asynchrone (thread worker). Suivi via GET /api/v1/jobs/{id}."""
    job = evalsvc.create_job(body.model, body.few_shot, body.limit, body.category)
    evalsvc.start_job_async(
        job["job_id"], body.model, body.few_shot, body.limit, body.category
    )
    return {
        "job_id": job["job_id"],
        "status": "queued",
        "model": body.model,
        "message": f"Suivi : GET /api/v1/jobs/{job['job_id']}",
    }
