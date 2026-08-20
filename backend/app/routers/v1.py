"""Endpoints publics AfriBench API v1."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.schemas import EvaluateAccepted, EvaluateRequest, JobStatus
from app.security import enforce_rate_limit, require_api_key
from app.services import data_loader as dl
from app.services import evaluate as evalsvc
from app.services import open_tasks as ot

router = APIRouter(tags=["v1"], dependencies=[Depends(enforce_rate_limit)])


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


@router.get("/models/configured")
def list_configured_models() -> list[dict]:
    """Modèles déclarés dans configs/models.yaml (pour lancer une évaluation)."""
    try:
        return evalsvc.list_configured_models()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/stats")
def stats() -> dict:
    payload = dl.build_stats(dl.get_questions(), dl.get_results())
    payload["validation_coverage"] = ot.build_validation_status()
    payload["translations"] = ot.load_translation_manifest()
    payload["open_tasks"] = {
        "n_tasks": len(ot.load_open_tasks()),
        "scores_available": bool(ot.load_open_scores().get("tasks")),
    }
    return payload


@router.get("/validation/status")
def validation_status() -> dict:
    return ot.build_validation_status()


@router.get("/translations")
def list_translations(
    lang: str = Query(..., description="sw | yo | am"),
    verified_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=500),
) -> list[dict]:
    if lang not in {"sw", "yo", "am"}:
        raise HTTPException(status_code=400, detail="lang must be sw, yo, or am")
    items = ot.load_translations(lang, verified_only=verified_only)
    return items[:limit]


@router.get("/translations/manifest")
def translations_manifest() -> dict:
    return ot.load_translation_manifest()


@router.get("/open/tasks")
def open_tasks(
    task_type: str | None = Query(None, description="open_qa | translation | …"),
    limit: int = Query(50, ge=1, le=200),
) -> list[dict]:
    items = ot.load_open_tasks(task_type=task_type)
    return items[:limit]


@router.get("/open/scores")
def open_scores() -> dict:
    return ot.load_open_scores()


@router.get("/leaderboard")
def leaderboard() -> dict:
    return dl.build_leaderboard(dl.get_questions(), dl.get_results())


@router.post(
    "/evaluate",
    response_model=EvaluateAccepted,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(require_api_key)],
)
def start_evaluate(body: EvaluateRequest) -> EvaluateAccepted:
    """
    Lance une évaluation AfriBench (asynchrone par défaut).

    Requiert le header `X-API-Key` (= AFRIBENCH_API_KEY) et la clé provider
    du modèle (OPENAI_API_KEY, etc.).
    """
    if body.sync and (body.limit is None or body.limit > 20):
        raise HTTPException(
            status_code=400,
            detail="sync=true nécessite limit≤20 (évite de bloquer le worker).",
        )

    job = evalsvc.create_job(body.model, body.few_shot, body.limit, body.category)

    if body.sync:
        done = evalsvc.run_job_sync(
            job["job_id"], body.model, body.few_shot, body.limit, body.category
        )
        status_val = done["status"]
        msg = (
            "Évaluation terminée."
            if status_val == "completed"
            else f"Évaluation échouée : {done.get('error')}"
        )
        return EvaluateAccepted(
            job_id=job["job_id"],
            status=status_val,
            model=body.model,
            message=msg,
        )

    evalsvc.start_job_async(
        job["job_id"], body.model, body.few_shot, body.limit, body.category
    )
    return EvaluateAccepted(
        job_id=job["job_id"],
        status="queued",
        model=body.model,
        message=f"Job créé. Suivi : GET /api/v1/jobs/{job['job_id']}",
    )


@router.get("/jobs/{job_id}", response_model=JobStatus)
def job_status(job_id: str) -> JobStatus:
    job = evalsvc.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job introuvable")
    return JobStatus(**job)


@router.get("/jobs")
def jobs(limit: int = Query(20, ge=1, le=100)) -> list[dict]:
    return evalsvc.list_jobs(limit=limit)


@router.post("/reload", dependencies=[Depends(require_api_key)])
def reload_catalog() -> dict:
    """Recharge questions/résultats depuis le disque (après une évaluation)."""
    dl.clear_catalog_cache()
    q, r = dl.get_questions(), dl.get_results()
    return {"reloaded": True, "questions": len(q), "results": len(r)}
