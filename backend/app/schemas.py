"""Schémas Pydantic pour l'API AfriBench."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class ProposalCreate(BaseModel):
    category: str = Field(..., min_length=2, max_length=64)
    difficulty: Literal["easy", "medium", "hard"]
    question: str = Field(..., min_length=20, max_length=1000)
    options: dict[str, str]
    answer: Literal["A", "B", "C", "D"]
    explanation: str = Field(..., min_length=20, max_length=3000)
    source: str = Field(..., min_length=8, max_length=1000)
    author: str | None = Field(None, max_length=80)

    @field_validator("options")
    @classmethod
    def validate_options(cls, value: dict[str, str]) -> dict[str, str]:
        if set(value) != {"A", "B", "C", "D"}:
            raise ValueError("Les options A, B, C et D sont requises.")
        cleaned = {key: text.strip() for key, text in value.items()}
        if any(len(text) < 1 or len(text) > 500 for text in cleaned.values()):
            raise ValueError("Chaque option doit contenir entre 1 et 500 caractères.")
        return cleaned


class ProposalVoteRequest(BaseModel):
    value: Literal[-1, 1]
    voter_id: str = Field(..., min_length=16, max_length=128)


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
