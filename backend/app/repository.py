"""Accès données : CRUD questions/résultats + seed depuis les fichiers JSON.

Les fonctions retournent des dicts (même forme que les JSON d'origine) pour que
la couche d'agrégation de ``data_loader`` reste inchangée.
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_session
from app.models import (
    EvalJob,
    Model,
    ProposalVote,
    Question,
    QuestionProposal,
    Result,
)

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
    cols = question_from_dict(data)
    cols["locked_by_admin"] = True
    q = Question(**cols)
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
    q.locked_by_admin = True
    return q


def delete_question(session: Session, qid: str) -> bool:
    q = session.get(Question, qid)
    if q is None:
        return False
    session.delete(q)
    return True


# ── Hub communautaire ─────────────────────────────────────────────────────

def proposal_to_dict(
    session: Session,
    proposal: QuestionProposal,
    voter_hash: str | None = None,
) -> dict[str, Any]:
    upvotes = session.scalar(
        select(func.count()).select_from(ProposalVote).where(
            ProposalVote.proposal_id == proposal.id,
            ProposalVote.value == 1,
        )
    ) or 0
    downvotes = session.scalar(
        select(func.count()).select_from(ProposalVote).where(
            ProposalVote.proposal_id == proposal.id,
            ProposalVote.value == -1,
        )
    ) or 0
    user_vote = 0
    if voter_hash:
        vote = session.scalar(
            select(ProposalVote).where(
                ProposalVote.proposal_id == proposal.id,
                ProposalVote.voter_hash == voter_hash,
            )
        )
        user_vote = vote.value if vote else 0
    return {
        "id": proposal.id,
        "category": proposal.category,
        "difficulty": proposal.difficulty,
        "question": proposal.question,
        "options": proposal.options or {},
        "answer": proposal.answer,
        "explanation": proposal.explanation,
        "source": proposal.source,
        "author": proposal.author,
        "status": proposal.status,
        "upvotes": upvotes,
        "downvotes": downvotes,
        "score": upvotes - downvotes,
        "total_votes": upvotes + downvotes,
        "user_vote": user_vote,
        "created_at": proposal.created_at.isoformat(),
    }


def list_proposals(
    session: Session,
    *,
    status: str = "pending",
    sort: str = "needs_votes",
    voter_hash: str | None = None,
) -> list[dict[str, Any]]:
    proposals = session.scalars(
        select(QuestionProposal)
        .where(QuestionProposal.status == status)
        .order_by(QuestionProposal.created_at.desc())
    ).all()
    rows = [proposal_to_dict(session, proposal, voter_hash) for proposal in proposals]
    if sort == "popular":
        rows.sort(key=lambda row: (row["score"], row["total_votes"]), reverse=True)
    elif sort == "new":
        rows.sort(key=lambda row: row["created_at"], reverse=True)
    else:
        rows.sort(key=lambda row: (row["total_votes"], row["created_at"]))
    return rows


def create_proposal(session: Session, data: dict[str, Any]) -> QuestionProposal:
    proposal = QuestionProposal(
        id=uuid.uuid4().hex[:16],
        category=data["category"],
        difficulty=data["difficulty"],
        question=data["question"].strip(),
        options=data["options"],
        answer=data["answer"],
        explanation=data["explanation"].strip(),
        source=data["source"].strip(),
        author=(data.get("author") or "").strip() or None,
        status="pending",
    )
    session.add(proposal)
    return proposal


def find_duplicate_proposal(session: Session, question: str) -> QuestionProposal | None:
    return session.scalar(
        select(QuestionProposal).where(
            func.lower(QuestionProposal.question) == question.strip().lower(),
            QuestionProposal.status == "pending",
        )
    )


def cast_proposal_vote(
    session: Session,
    proposal_id: str,
    voter_hash: str,
    value: int,
) -> QuestionProposal | None:
    proposal = session.get(QuestionProposal, proposal_id)
    if proposal is None or proposal.status != "pending":
        return None
    vote = session.scalar(
        select(ProposalVote).where(
            ProposalVote.proposal_id == proposal_id,
            ProposalVote.voter_hash == voter_hash,
        )
    )
    if vote is None:
        session.add(
            ProposalVote(
                proposal_id=proposal_id,
                voter_hash=voter_hash,
                value=value,
            )
        )
    elif vote.value == value:
        session.delete(vote)
    else:
        vote.value = value
    return proposal


def update_proposal_status(
    session: Session,
    proposal_id: str,
    status: str,
) -> QuestionProposal | None:
    proposal = session.get(QuestionProposal, proposal_id)
    if proposal is None:
        return None
    proposal.status = status
    return proposal


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


# ── Seed (versionné : upsert si seed_version plus récent, sauf locked_by_admin) ─

def seed(
    questions: list[dict[str, Any]],
    results: list[dict[str, Any]],
    *,
    seed_version: int | None = None,
) -> dict[str, Any]:
    """Synchronise questions/résultats depuis les fichiers JSON."""
    from app.services.data_loader import load_questions_seed_version

    version = seed_version if seed_version is not None else load_questions_seed_version()
    session = get_session()
    try:
        q_stats = _seed_questions(session, questions, version)
        n_r = _seed_results(session, results)
        session.commit()
        return {"questions": {**q_stats, "seed_version": version}, "results": n_r}
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def _seed_questions(
    session: Session, questions: list[dict[str, Any]], seed_version: int
) -> dict[str, int]:
    rows: list[dict[str, Any]] = []
    for q in questions:
        if not q.get("id"):
            continue
        cols = question_from_dict(q)
        cols["seed_version"] = seed_version
        rows.append(cols)
    if not rows:
        return {"processed": 0}

    insert_stmt = pg_insert(Question).values(rows)
    excluded = insert_stmt.excluded
    update_set = {
        "category": excluded.category,
        "subcategory": excluded.subcategory,
        "difficulty": excluded.difficulty,
        "language": excluded.language,
        "question": excluded.question,
        "options": excluded.options,
        "answer": excluded.answer,
        "explanation": excluded.explanation,
        "source": excluded.source,
        "author": excluded.author,
        "date_created": excluded.date_created,
        "date_validated": excluded.date_validated,
        "validated_by": excluded.validated_by,
        "is_control": excluded.is_control,
        "seed_version": excluded.seed_version,
    }
    stmt = insert_stmt.on_conflict_do_update(
        index_elements=[Question.id],
        set_=update_set,
        where=(Question.locked_by_admin.is_(False))
        & (excluded.seed_version > Question.seed_version),
    )
    session.execute(stmt)
    return {"processed": len(rows)}


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


def _fernet():
    """Clé Fernet depuis la config (None si absente ou cryptography manquant)."""
    try:
        from cryptography.fernet import Fernet
    except ImportError:
        return None
    key = (get_settings().encryption_key or "").strip()
    if not key:
        return None
    try:
        return Fernet(key.encode())
    except Exception:
        return None


def _encrypt_secret(plaintext: str | None) -> str | None:
    if not plaintext:
        return None
    f = _fernet()
    if f is None:
        return plaintext
    return "enc:" + f.encrypt(plaintext.encode()).decode()


def _decrypt_secret(stored: str | None) -> str | None:
    if not stored:
        return None
    if not stored.startswith("enc:"):
        return stored  # legacy (stocké en clair avant chiffrement)
    f = _fernet()
    if f is None:
        return None
    try:
        return f.decrypt(stored[4:].encode()).decode()
    except Exception:
        return None


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
        out["api_key"] = _decrypt_secret(m.api_key)
    else:
        out["api_key_set"] = bool(
            m.api_key or (m.api_key_env and os.environ.get(m.api_key_env))
        )
    return out


def model_from_dict(data: dict[str, Any]) -> dict[str, Any]:
    cols = {k: data.get(k) for k in _MODEL_FIELDS}
    cols["api_key"] = _encrypt_secret(data.get("api_key"))
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


# ── Jobs d'évaluation (persistants) ───────────────────────────────────────

_EVAL_RUNNER_LOCK_KEY = 42424242


def _dt_to_iso(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None


def _parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def job_to_dict(j: EvalJob) -> dict[str, Any]:
    return {
        "job_id": j.job_id,
        "status": j.status,
        "model": j.model,
        "few_shot": j.few_shot,
        "limit": j.limit,
        "category": j.category,
        "created_at": _dt_to_iso(j.created_at) or "",
        "started_at": _dt_to_iso(j.started_at),
        "finished_at": _dt_to_iso(j.finished_at),
        "error": j.error,
        "result_summary": j.result_summary,
        "result_path": j.result_path,
    }


def get_job(job_id: str) -> dict[str, Any] | None:
    session = get_session()
    try:
        row = session.get(EvalJob, job_id)
        return job_to_dict(row) if row else None
    finally:
        session.close()


def list_jobs(limit: int = 20) -> list[dict[str, Any]]:
    session = get_session()
    try:
        rows = session.scalars(
            select(EvalJob).order_by(EvalJob.created_at.desc()).limit(limit)
        ).all()
        return [job_to_dict(j) for j in rows]
    finally:
        session.close()


def list_jobs_by_status(status: str) -> list[dict[str, Any]]:
    session = get_session()
    try:
        rows = session.scalars(
            select(EvalJob)
            .where(EvalJob.status == status)
            .order_by(EvalJob.created_at.asc())
        ).all()
        return [job_to_dict(j) for j in rows]
    finally:
        session.close()


def create_job(
    job_id: str,
    model: str,
    few_shot: int,
    limit: int | None,
    category: str | None,
    *,
    created_at: str | None = None,
) -> dict[str, Any]:
    session = get_session()
    try:
        now = _parse_iso(created_at) or datetime.now(timezone.utc)
        row = EvalJob(
            job_id=job_id,
            status="queued",
            model=model,
            few_shot=few_shot,
            limit=limit,
            category=category,
            created_at=now,
        )
        session.add(row)
        session.commit()
        session.refresh(row)
        return job_to_dict(row)
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def update_job(job_id: str, **kwargs: Any) -> None:
    iso_fields = {"created_at", "started_at", "finished_at"}
    session = get_session()
    try:
        row = session.get(EvalJob, job_id)
        if row is None:
            return
        for key, value in kwargs.items():
            if key in iso_fields and isinstance(value, str):
                value = _parse_iso(value)
            setattr(row, key, value)
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def recover_stale_jobs() -> dict[str, int]:
    """Marque les jobs 'running' interrompus au redémarrage."""
    session = get_session()
    try:
        now = datetime.now(timezone.utc)
        running = session.scalars(select(EvalJob).where(EvalJob.status == "running")).all()
        for job in running:
            job.status = "failed"
            job.finished_at = now
            job.error = "Interrompu au redémarrage du serveur."
        session.commit()
        return {"failed_running": len(running)}
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def try_acquire_eval_runner_lock() -> bool:
    """Verrou exclusif d'évaluation (une seule à la fois, multi-réplica)."""
    session = get_session()
    try:
        acquired = session.execute(
            text("SELECT pg_try_advisory_lock(:key)"),
            {"key": _EVAL_RUNNER_LOCK_KEY},
        ).scalar()
        session.commit()
        return bool(acquired)
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def release_eval_runner_lock() -> None:
    session = get_session()
    try:
        session.execute(
            text("SELECT pg_advisory_unlock(:key)"),
            {"key": _EVAL_RUNNER_LOCK_KEY},
        )
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
