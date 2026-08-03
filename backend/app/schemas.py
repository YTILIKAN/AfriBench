"""Schémas Pydantic pour l'API AfriBench."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class EvaluateRequest(BaseModel):
    model: str = Field(..., description="Nom du modèle (configs/models.yaml), ex: gpt-4o")
    few_shot: int = Field(0, ge=0, le=10, description="Nombre d'exemples few-shot")
    limit: int | None = Field(
        None,
        ge=1,
        le=500,
        description="Limiter le nombre de questions (smoke test). None = toutes.",
    )
    category: str | None = Field(None, description="Évaluer une seule catégorie")
    sync: bool = Field(
        False,
        description="Si true, bloque jusqu'à la fin (uniquement pour limit≤20).",
    )


class EvaluateAccepted(BaseModel):
    job_id: str
    status: Literal["queued", "running", "completed", "failed"]
    model: str
    message: str


class JobStatus(BaseModel):
    job_id: str
    status: Literal["queued", "running", "completed", "failed"]
    model: str
    created_at: str
    started_at: str | None = None
    finished_at: str | None = None
    error: str | None = None
    result_summary: dict | None = None
    result_path: str | None = None
