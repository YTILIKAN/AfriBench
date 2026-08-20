"""Modèles SQLAlchemy : questions et résultats du benchmark AfriBench."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    category: Mapped[str] = mapped_column(String(64), index=True)
    subcategory: Mapped[str | None] = mapped_column(String(128), nullable=True)
    difficulty: Mapped[str | None] = mapped_column(String(16), nullable=True)
    language: Mapped[str] = mapped_column(String(8), default="fr")
    question: Mapped[str] = mapped_column(Text)
    options: Mapped[dict] = mapped_column(JSONB, default=dict)
    answer: Mapped[str | None] = mapped_column(String(8), nullable=True)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str | None] = mapped_column(Text, nullable=True)
    author: Mapped[str | None] = mapped_column(String(128), nullable=True)
    date_created: Mapped[str | None] = mapped_column(String(32), nullable=True)
    date_validated: Mapped[str | None] = mapped_column(String(32), nullable=True)
    validated_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    is_control: Mapped[bool] = mapped_column(Boolean, default=False)
    seed_version: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    locked_by_admin: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now
    )


class Result(Base):
    __tablename__ = "results"
    __table_args__ = (
        UniqueConstraint("model", "timestamp", name="uq_results_model_timestamp"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    model: Mapped[str] = mapped_column(String(128), index=True)
    model_label: Mapped[str | None] = mapped_column(String(128), nullable=True)
    timestamp: Mapped[str] = mapped_column(String(64))
    total: Mapped[int] = mapped_column(Integer, default=0)
    correct: Mapped[int] = mapped_column(Integer, default=0)
    incorrect: Mapped[int | None] = mapped_column(Integer, nullable=True)
    no_answer: Mapped[int | None] = mapped_column(Integer, nullable=True)
    accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)
    by_category: Mapped[dict] = mapped_column(JSONB, default=dict)
    by_difficulty: Mapped[dict] = mapped_column(JSONB, default=dict)
    details: Mapped[Any | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now
    )


class EvalJob(Base):
    """Job d'évaluation asynchrone (persistant entre redéploiements / réplicas)."""

    __tablename__ = "eval_jobs"

    job_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    status: Mapped[str] = mapped_column(String(16), index=True, default="queued")
    model: Mapped[str] = mapped_column(String(128))
    few_shot: Mapped[int] = mapped_column(Integer, default=0)
    limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    result_summary: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    result_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    worker_id: Mapped[str | None] = mapped_column(String(128), nullable=True)


class RateLimitHit(Base):
    """Frappe rate-limit (fenêtre glissante, partagée entre réplicas)."""

    __tablename__ = "rate_limit_hits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(512), index=True)
    hit_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)


class Model(Base):
    """Modèle configuré pour l'évaluation (fournisseur, id, clé API)."""

    __tablename__ = "models"

    name: Mapped[str] = mapped_column(String(128), primary_key=True)
    label: Mapped[str | None] = mapped_column(String(128), nullable=True)
    provider: Mapped[str] = mapped_column(String(32), default="openai")
    model_id: Mapped[str] = mapped_column(String(256), default="")
    api_base: Mapped[str | None] = mapped_column(String(256), nullable=True)
    api_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    api_key_env: Mapped[str | None] = mapped_column(String(64), nullable=True)
    max_tokens: Mapped[int] = mapped_column(Integer, default=256)
    temperature: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now
    )
