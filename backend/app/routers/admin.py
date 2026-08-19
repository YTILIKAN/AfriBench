"""Endpoints backoffice (CRUD questions/résultats) — protégés par session admin."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import repository as repo
from app.admin_auth import issue_token, require_admin, verify_admin_password
from app.config import Settings, get_settings
from app.db import get_db

router = APIRouter(prefix="/admin", tags=["admin"])


class LoginIn(BaseModel):
    password: str = Field(..., min_length=1)


class LoginOut(BaseModel):
    token: str
    expires_in: int


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
