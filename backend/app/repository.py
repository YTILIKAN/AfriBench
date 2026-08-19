"""Accès données : CRUD questions/résultats + seed depuis les fichiers JSON.

Les fonctions retournent des dicts (même forme que les JSON d'origine) pour que
la couche d'agrégation de ``data_loader`` reste inchangée.
"""

from __future__ import annotations

import os
from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.db import get_session
from app.models import Model, Question, Result

# ── Conversion modèle ↔ dict ──────────────────────────────────────────────

_QUESTION_FIELDS = (
    "id",
    "category",
    "subcategory",
    "difficulty",
    "language",
    "question",
    "options",
    "answer",
    "explanation",
    "source",
    "author",
    "date_created",
    "date_validated",
    "validated_by",
)

_RESULT_FIELDS = (
    "model",
    "model_label",
    "timestamp",
    "total",
    "correct",
    "incorrect",
    "no_answer",
    "accuracy",
    "by_category",
    "by_difficulty",
    "details",
)


def question_to_dict(q: Question) -> dict[str, Any]:
    return {
        "id": q.id,
        "category": q.category,
        "subcategory": q.subcategory,
        "difficulty": q.difficulty,
        "language": q.language,
        "question": q.question,
        "options": q.options or {},
        "answer": q.answer,
        "explanation": q.explanation,
        "source": q.source,
        "author": q.author,
        "date_created": q.date_created,
        "date_validated": q.date_validated,
        "validated_by": q.validated_by,
        "is_control": bool(q.is_control),
    }


def question_from_dict(data: dict[str, Any]) -> dict[str, Any]:
    cols = {k: data.get(k) for k in _QUESTION_FIELDS}
    cols["options"] = data.get("options") or {}
    cols["is_control"] = bool(data.get("is_control", False))
    return cols


def result_to_dict(r: Result) -> dict[str, Any]:
    accuracy = r.accuracy
    if accuracy is None and r.total:
        accuracy = round(r.correct / r.total * 100, 1)
    return {
        "id": r.id,
        "model": r.model,
        "model_label": r.model_label,
        "timestamp": r.timestamp,
        "total": r.total,
        "correct": r.correct,
        "incorrect": r.incorrect,
        "no_answer": r.no_answer,
        "accuracy": accuracy,
        "by_category": r.by_category or {},
        "by_difficulty": r.by_difficulty or {},
        "details": r.details,
    }


def result_from_dict(data: dict[str, Any]) -> dict[str, Any]:
    cols = {k: data.get(k) for k in _RESULT_FIELDS}
    if cols.get("accuracy") is None:
        total = cols.get("total") or 0
        correct = cols.get("correct") or 0
        cols["accuracy"] = round(correct / total * 100, 1) if total else None
    cols["by_category"] = data.get("by_category") or {}
    cols["by_difficulty"] = data.get("by_difficulty") or {}
    return cols


# ── Lecture (DB → dicts) ─────────────────────────────────────────────────

def list_questions() -> list[dict[str, Any]]:
    session = get_session()
    try:
        rows = session.scalars(select(Question).order_by(Question.id)).all()
        return [question_to_dict(q) for q in rows]
    finally:
        session.close()


def list_results() -> list[dict[str, Any]]:
    session = get_session()
    try:
        rows = session.scalars(
            select(Result).order_by(Result.timestamp.desc(), Result.id.desc())
        ).all()
        return [result_to_dict(r) for r in rows]
    finally:
        session.close()


# ── CRUD questions (session fournie par le routeur, commit côté routeur) ──

def get_question(session: Session, qid: str) -> Question | None:
    return session.get(Question, qid)


def create_question(session: Session, data: dict[str, Any]) -> Question:
    q = Question(**question_from_dict(data))
    session.add(q)
    return q


def update_question(session: Session, qid: str, data: dict[str, Any]) -> Question | None:
    q = session.get(Question, qid)
    if q is None:
        return None
    cols = question_from_dict(data)
    cols.pop("id", None)  # l'id n'est pas modifiable
    for key, value in cols.items():
        setattr(q, key, value)
    return q


def delete_question(session: Session, qid: str) -> bool:
    q = session.get(Question, qid)
    if q is None:
        return False
    session.delete(q)
    return True


# ── CRUD résultats ───────────────────────────────────────────────────────

def get_result(session: Session, rid: int) -> Result | None:
    return session.get(Result, rid)


def create_result(session: Session, data: dict[str, Any]) -> Result:
    r = Result(**result_from_dict(data))
    session.add(r)
    return r


def update_result(session: Session, rid: int, data: dict[str, Any]) -> Result | None:
    r = session.get(Result, rid)
    if r is None:
        return None
    cols = result_from_dict(data)
    cols.pop("id", None)
    for key, value in cols.items():
        setattr(r, key, value)
    return r


def delete_result(session: Session, rid: int) -> bool:
    r = session.get(Result, rid)
    if r is None:
        return False
    session.delete(r)
    return True


# ── Seed (idempotent, ON CONFLICT DO NOTHING) ─────────────────────────────

def seed(questions: list[dict[str, Any]], results: list[dict[str, Any]]) -> dict[str, int]:
    """Insère questions/résultats sans écraser les lignes existantes (éditées via backoffice)."""
    session = get_session()
    try:
        n_q = _seed_questions(session, questions)
        n_r = _seed_results(session, results)
        session.commit()
        return {"questions": n_q, "results": n_r}
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def _seed_questions(session: Session, questions: list[dict[str, Any]]) -> int:
    rows = [question_from_dict(q) for q in questions if q.get("id")]
    if not rows:
        return 0
    stmt = pg_insert(Question).values(rows).on_conflict_do_nothing(
        index_elements=[Question.id]
    )
    session.execute(stmt)
    return len(rows)


def _seed_results(session: Session, results: list[dict[str, Any]]) -> int:
    rows = [result_from_dict(r) for r in results if r.get("model")]
    if not rows:
        return 0
    stmt = pg_insert(Result).values(rows).on_conflict_do_nothing(
        index_elements=[Result.model, Result.timestamp]
    )
    session.execute(stmt)
    return len(rows)


# ── Modèles (config évaluation) ─────────────────────────────────────────

_MODEL_FIELDS = (
    "name",
    "label",
    "provider",
    "model_id",
    "api_base",
    "api_key",
    "api_key_env",
    "max_tokens",
    "temperature",
)


def model_to_dict(m: Model, *, include_secret: bool = False) -> dict[str, Any]:
    out = {
        "name": m.name,
        "label": m.label,
        "provider": m.provider,
        "model_id": m.model_id,
        "api_base": m.api_base,
        "api_key_env": m.api_key_env,
        "max_tokens": m.max_tokens,
        "temperature": m.temperature,
    }
    if include_secret:
        out["api_key"] = m.api_key
    else:
        out["api_key_set"] = bool(
            m.api_key or (m.api_key_env and os.environ.get(m.api_key_env))
        )
    return out


def model_from_dict(data: dict[str, Any]) -> dict[str, Any]:
    cols = {k: data.get(k) for k in _MODEL_FIELDS}
    if not cols.get("api_key"):
        cols["api_key"] = None
    return cols


def list_models(*, include_secret: bool = False) -> list[dict[str, Any]]:
    session = get_session()
    try:
        rows = session.scalars(select(Model).order_by(Model.name)).all()
        return [model_to_dict(m, include_secret=include_secret) for m in rows]
    finally:
        session.close()


def get_model_dict(name: str, *, include_secret: bool = False) -> dict[str, Any] | None:
    session = get_session()
    try:
        m = session.get(Model, name)
        return model_to_dict(m, include_secret=include_secret) if m else None
    finally:
        session.close()


def get_model(session: Session, name: str) -> Model | None:
    return session.get(Model, name)


def create_model(session: Session, data: dict[str, Any]) -> Model:
    m = Model(**model_from_dict(data))
    session.add(m)
    return m


def update_model(session: Session, name: str, data: dict[str, Any]) -> Model | None:
    m = session.get(Model, name)
    if m is None:
        return None
    cols = model_from_dict(data)
    cols.pop("name", None)
    # Préserver la clé existante si le payload ne fournit pas de nouvelle clé
    if not cols.get("api_key"):
        cols.pop("api_key", None)
    for key, value in cols.items():
        setattr(m, key, value)
    return m


def delete_model(session: Session, name: str) -> bool:
    m = session.get(Model, name)
    if m is None:
        return False
    session.delete(m)
    return True


def seed_models(models_list: list[dict[str, Any]]) -> int:
    session = get_session()
    try:
        rows = [model_from_dict(m) for m in models_list if m.get("name")]
        if not rows:
            return 0
        stmt = pg_insert(Model).values(rows).on_conflict_do_nothing(
            index_elements=[Model.name]
        )
        session.execute(stmt)
        session.commit()
        return len(rows)
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def add_result(result: dict[str, Any]) -> None:
    """Insère un résultat d'évaluation (session dédiée, commit immédiat)."""
    session = get_session()
    try:
        session.add(Result(**result_from_dict(result)))
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
