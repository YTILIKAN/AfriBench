"""AfriBench API — service backend FastAPI."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.config import get_settings
from app.routers.admin import router as admin_router
from app.routers.v1 import router as v1_router

logger = logging.getLogger("afribench")
settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.db_enabled:
        try:
            from app import repository
            from app.db import init_db
            from app.services import data_loader as dl

            init_db()
            seeded = repository.seed(dl.load_questions(), dl.load_results())
            models_n = repository.seed_models(dl.load_models())
            recovered = repository.recover_stale_jobs()
            logger.info(
                "DB initialisée + seed : %s (modèles : %s, jobs interrompus : %s)",
                seeded,
                models_n,
                recovered,
            )
            from app.services import evaluate as evalsvc

            evalsvc.resume_queued_jobs()
        except Exception as exc:  # noqa: BLE001
            logger.exception("Initialisation DB échouée, fallback fichiers : %s", exc)
    yield


app = FastAPI(
    title=settings.app_name,
    version=__version__,
    description=(
        "API publique AfriBench — résultats d'évaluation, questions du benchmark, "
        "classement et statistiques."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Prototype : CORS ouvert. Restreindre via AFRIBENCH_CORS_ORIGINS en prod.
_origins = settings.cors_origin_list or ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins if _origins != ["*"] else ["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(v1_router, prefix=settings.api_prefix)
app.include_router(admin_router, prefix=settings.api_prefix)


@app.get("/")
def root() -> dict:
    return {
        "service": "afribench-backend",
        "version": __version__,
        "docs": "/docs",
        "api": settings.api_prefix,
        "database": "postgresql" if settings.db_enabled else "none",
        "rate_limit_backend": (
            "redis"
            if settings.redis_enabled
            else ("postgres" if settings.db_enabled else "memory")
        ),
        "admin_enabled": settings.admin_enabled,
        "endpoints": [
            f"{settings.api_prefix}/health",
            f"{settings.api_prefix}/results",
            f"{settings.api_prefix}/questions",
            f"{settings.api_prefix}/proposals",
            f"{settings.api_prefix}/models",
            f"{settings.api_prefix}/stats",
            f"{settings.api_prefix}/leaderboard",
            f"{settings.api_prefix}/admin/login",
            f"{settings.api_prefix}/admin/questions",
            f"{settings.api_prefix}/admin/results",
        ],
        "write_api_enabled": bool(settings.api_key),
    }
