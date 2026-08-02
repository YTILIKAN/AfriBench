"""AfriBench API — service backend FastAPI."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.config import get_settings
from app.routers.v1 import router as v1_router

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=__version__,
    description=(
        "API publique AfriBench — résultats d'évaluation, questions du benchmark, "
        "classement et statistiques."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

# Prototype : CORS ouvert. Restreindre via AFRIBENCH_CORS_ORIGINS en prod.
_origins = settings.cors_origin_list or ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins if _origins != ["*"] else ["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(v1_router, prefix=settings.api_prefix)


@app.get("/")
def root() -> dict:
    return {
        "service": "afribench-backend",
        "version": __version__,
        "docs": "/docs",
        "api": settings.api_prefix,
        "endpoints": [
            f"{settings.api_prefix}/health",
            f"{settings.api_prefix}/results",
            f"{settings.api_prefix}/questions",
            f"{settings.api_prefix}/models",
            f"{settings.api_prefix}/models/configured",
            f"{settings.api_prefix}/stats",
            f"{settings.api_prefix}/leaderboard",
            f"{settings.api_prefix}/evaluate",
            f"{settings.api_prefix}/jobs",
        ],
        "write_api_enabled": bool(settings.api_key),
    }
