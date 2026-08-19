"""Lancement d'évaluations via scripts/afribench.py (jobs asynchrones)."""

from __future__ import annotations

import importlib.util
import os
import sys
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from app.config import REPO_ROOT, get_settings
from app.services import data_loader as dl

_jobs: dict[str, dict[str, Any]] = {}
_jobs_lock = threading.Lock()
_runner_lock = threading.Lock()  # une évaluation à la fois


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_afribench():
    """Import dynamique de scripts/afribench.py sans installer le package."""
    path = REPO_ROOT / "scripts" / "afribench.py"
    if not path.exists():
        raise FileNotFoundError(f"Script introuvable : {path}")
    spec = importlib.util.spec_from_file_location("afribench_cli", path)
    if spec is None or spec.loader is None:
        raise ImportError("Impossible de charger afribench.py")
    mod = importlib.util.module_from_spec(spec)
    # Évite de ré-exécuter main si déjà chargé
    if "afribench_cli" in sys.modules:
        return sys.modules["afribench_cli"]
    sys.modules["afribench_cli"] = mod
    spec.loader.exec_module(mod)
    return mod


def _resolve_model(model_name: str) -> dict[str, Any] | None:
    """Résout un modèle depuis la DB (clé incluse) sinon configs/models.yaml."""
    if get_settings().db_enabled:
        try:
            from app import repository

            m = repository.get_model_dict(model_name, include_secret=True)
            if m:
                return m
        except Exception:  # noqa: BLE001 — DB indisponible → fallback yaml
            pass
    afri = _load_afribench()
    for m in afri.load_models():
        if m["name"] == model_name:
            return m
    return None


def list_configured_models() -> list[dict[str, Any]]:
    if get_settings().db_enabled:
        try:
            from app import repository

            return [
                {
                    "name": m["name"],
                    "label": m.get("label") or m["name"],
                    "provider": m.get("provider"),
                    "api_key_env": m.get("api_key_env"),
                    "api_key_set": m.get("api_key_set"),
                }
                for m in repository.list_models()
            ]
        except Exception:  # noqa: BLE001
            pass
    afri = _load_afribench()
    return [
        {
            "name": m["name"],
            "label": m.get("label", m["name"]),
            "provider": m.get("provider"),
            "api_key_env": m.get("api_key_env"),
            "api_key_set": bool(os.environ.get(m.get("api_key_env", ""), "")),
        }
        for m in afri.load_models()
    ]


def get_job(job_id: str) -> dict[str, Any] | None:
    with _jobs_lock:
        job = _jobs.get(job_id)
        return dict(job) if job else None


def list_jobs(limit: int = 20) -> list[dict[str, Any]]:
    with _jobs_lock:
        jobs = sorted(_jobs.values(), key=lambda j: j["created_at"], reverse=True)
        return [dict(j) for j in jobs[:limit]]


def create_job(model: str, few_shot: int, limit: int | None, category: str | None) -> dict[str, Any]:
    job_id = uuid.uuid4().hex[:12]
    job = {
        "job_id": job_id,
        "status": "queued",
        "model": model,
        "few_shot": few_shot,
        "limit": limit,
        "category": category,
        "created_at": _utc_now(),
        "started_at": None,
        "finished_at": None,
        "error": None,
        "result_summary": None,
        "result_path": None,
    }
    with _jobs_lock:
        _jobs[job_id] = job
    return dict(job)


def _update_job(job_id: str, **kwargs: Any) -> None:
    with _jobs_lock:
        if job_id in _jobs:
            _jobs[job_id].update(kwargs)


def run_evaluation(
    job_id: str,
    model_name: str,
    few_shot: int = 0,
    limit: int | None = None,
    category: str | None = None,
) -> None:
    """Exécute l'évaluation (thread worker). Une seule à la fois."""
    acquired = _runner_lock.acquire(blocking=False)
    if not acquired:
        _update_job(
            job_id,
            status="failed",
            finished_at=_utc_now(),
            error="Une évaluation est déjà en cours. Réessayez plus tard.",
        )
        return

    try:
        _update_job(job_id, status="running", started_at=_utc_now())
        afri = _load_afribench()
        model = _resolve_model(model_name)
        if model is None:
            raise ValueError(f"Modèle '{model_name}' introuvable (DB ou configs/models.yaml).")

        # Échec rapide si aucune clé API n'est disponible (évite un run à 0%)
        if not (model.get("api_key") or os.environ.get(model.get("api_key_env", ""))):
            raise RuntimeError(
                f"Clé API manquante pour '{model_name}'. "
                f"Ajoutez-la dans l'onglet Modèles du backoffice."
            )

        questions = afri.load_questions("v1")
        if category:
            questions = [q for q in questions if q.get("category") == category]
            if not questions:
                raise ValueError(f"Aucune question pour la catégorie '{category}'.")
        if limit is not None:
            questions = questions[:limit]

        few = questions[:few_shot] if few_shot > 0 else None
        # Ne pas réutiliser les few-shot dans le set évalué
        eval_questions = questions[few_shot:] if few_shot > 0 else questions
        if not eval_questions:
            raise ValueError("Aucune question à évaluer après few-shot/limit.")

        results = afri.evaluate_model(model, eval_questions, few, verbose=False)
        path = afri.save_results(results)

        # Persister le résultat dans la DB (source de vérité)
        if get_settings().db_enabled:
            try:
                from app import repository

                repository.add_result(results)
            except Exception:  # noqa: BLE001 — non fatal
                pass

        # Invalider le cache API
        dl.clear_catalog_cache()

        summary = {
            "model": results.get("model"),
            "model_label": results.get("model_label"),
            "accuracy": results.get("accuracy"),
            "correct": results.get("correct"),
            "total": results.get("total"),
            "timestamp": results.get("timestamp"),
        }
        _update_job(
            job_id,
            status="completed",
            finished_at=_utc_now(),
            result_summary=summary,
            result_path=str(path),
        )
    except Exception as exc:  # noqa: BLE001 — surface to job status
        _update_job(
            job_id,
            status="failed",
            finished_at=_utc_now(),
            error=str(exc),
        )
    finally:
        _runner_lock.release()


def start_job_async(
    job_id: str,
    model_name: str,
    few_shot: int,
    limit: int | None,
    category: str | None,
) -> None:
    thread = threading.Thread(
        target=run_evaluation,
        args=(job_id, model_name, few_shot, limit, category),
        name=f"afribench-eval-{job_id}",
        daemon=True,
    )
    thread.start()


def run_job_sync(
    job_id: str,
    model_name: str,
    few_shot: int,
    limit: int | None,
    category: str | None,
) -> dict[str, Any]:
    run_evaluation(job_id, model_name, few_shot, limit, category)
    job = get_job(job_id)
    assert job is not None
    return job
