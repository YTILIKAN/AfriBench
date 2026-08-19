"""Accès données : CRUD questions/résultats + seed depuis les fichiers JSON.

Les fonctions retournent des dicts (même forme que les JSON d'origine) pour que
la couche d'agrégation de ``data_loader`` reste inchangée.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.db import get_session
from app.models import Question, Result

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
