"""Endpoints publics AfriBench API v1."""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.services import data_loader as dl

router = APIRouter(tags=["v1"])


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "afribench-backend"}


@router.get("/results")
def list_results(
    model: str | None = Query(None, description="Filtrer par modèle"),
    category: str | None = Query(None, description="Filtrer par catégorie"),
    limit: int = Query(50, ge=1, le=1000),
) -> list[dict]:
    return dl.filter_results(dl.get_results(), model=model, category=category, limit=limit)


@router.get("/questions")
def list_questions(
    category: str | None = Query(None, description="Filtrer par catégorie"),
    difficulty: str | None = Query(None, description="easy | medium | hard"),
    limit: int = Query(50, ge=1, le=500),
) -> list[dict]:
    return dl.filter_questions(
        dl.get_questions(), category=category, difficulty=difficulty, limit=limit
    )


@router.get("/models")
def list_models(
    sort: str = Query("desc", description="asc | desc"),
    open: bool | None = Query(None, description="Filtrer open weights uniquement"),
) -> list[dict]:
    sort_norm = sort.lower() if sort.lower() in ("asc", "desc") else "desc"
    return dl.build_models_payload(dl.get_results(), sort=sort_norm, open_only=open)


@router.get("/stats")
def stats() -> dict:
    return dl.build_stats(dl.get_questions(), dl.get_results())


@router.get("/leaderboard")
def leaderboard() -> dict:
    return dl.build_leaderboard(dl.get_questions(), dl.get_results())


@router.post("/reload", include_in_schema=False)
def reload_catalog() -> dict:
    """Recharge questions/résultats depuis le disque (dev / après une évaluation)."""
    dl.clear_catalog_cache()
    q, r = dl.get_questions(), dl.get_results()
    return {"reloaded": True, "questions": len(q), "results": len(r)}
