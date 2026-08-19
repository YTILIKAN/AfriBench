"""Chargement et agrégation des questions / résultats AfriBench."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.config import Settings, get_settings

OPEN_WEIGHT_KEYWORDS = (
    "llama",
    "qwen",
    "mistral",
    "gemma",
    "deepseek",
    "olmo",
    "phi",
    "bloom",
)


def _read_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def load_questions(settings: Settings | None = None) -> list[dict[str, Any]]:
    settings = settings or get_settings()
    questions: list[dict[str, Any]] = []
    qdir = settings.questions_dir
    if not qdir.exists():
        return questions

    for fpath in sorted(qdir.glob("*.json")):
        if fpath.name == "template.json":
            continue
        data = _read_json(fpath)
        if isinstance(data, list):
            questions.extend(data)
        elif isinstance(data, dict):
            questions.append(data)
    return questions


def load_results(settings: Settings | None = None) -> list[dict[str, Any]]:
    """Charge les résultats d'évaluation (un fichier = un run, ou un tableau)."""
    settings = settings or get_settings()
    results: list[dict[str, Any]] = []
    rdir = settings.results_dir

    if rdir.exists():
        for fpath in sorted(rdir.glob("*.json")):
            try:
                data = _read_json(fpath)
            except json.JSONDecodeError:
                continue
            if isinstance(data, list):
                results.extend(item for item in data if isinstance(item, dict))
            elif isinstance(data, dict):
                results.append(data)

    if not results and settings.results_fallback.exists():
        data = _read_json(settings.results_fallback)
        if isinstance(data, list):
            results = [item for item in data if isinstance(item, dict)]

    results.sort(key=lambda r: r.get("timestamp", ""), reverse=True)
    return results


def is_open_weights(model: dict[str, Any]) -> bool:
    name = f"{model.get('model', '')} {model.get('model_label', '')}".lower()
    return any(k in name for k in OPEN_WEIGHT_KEYWORDS)


def latest_results_by_model(results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Un résultat par modèle (le plus récent)."""
    latest: dict[str, dict[str, Any]] = {}
    for r in results:
        key = r.get("model") or r.get("model_label")
        if not key:
            continue
        if key not in latest:
            latest[key] = r
    return sorted(latest.values(), key=lambda m: m.get("accuracy") or 0, reverse=True)


def filter_questions(
    questions: list[dict[str, Any]],
    *,
    category: str | None = None,
    difficulty: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    out = questions
    if category:
        out = [q for q in out if q.get("category") == category]
    if difficulty:
        out = [q for q in out if q.get("difficulty") == difficulty]
    return out[: max(0, limit)]


def filter_results(
    results: list[dict[str, Any]],
    *,
    model: str | None = None,
    category: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    out = results
    if model:
        needle = model.lower()
        out = [
            r
            for r in out
            if needle in (r.get("model") or "").lower()
            or needle in (r.get("model_label") or "").lower()
        ]
    if category:
        filtered = []
        for r in out:
            cats = r.get("by_category") or {}
            if category in cats:
                # retourne un résumé allégé pour la catégorie demandée
                item = {k: v for k, v in r.items() if k != "details"}
                item["by_category"] = {category: cats[category]}
                filtered.append(item)
        out = filtered
    else:
        # Ne pas renvoyer details[] par défaut (payload lourd)
        out = [{k: v for k, v in r.items() if k != "details"} for r in out]
    return out[: max(0, limit)]


def build_models_payload(
    results: list[dict[str, Any]],
    *,
    sort: str = "desc",
    open_only: bool | None = None,
) -> list[dict[str, Any]]:
    models = latest_results_by_model(results)
    payload = []
    for m in models:
        open_w = is_open_weights(m)
        if open_only is True and not open_w:
            continue
        if open_only is False and open_w:
            continue
        payload.append(
            {
                "id": m.get("model"),
                "label": m.get("model_label") or m.get("model"),
                "accuracy": m.get("accuracy"),
                "correct": m.get("correct"),
                "total": m.get("total"),
                "open_weights": open_w,
                "timestamp": m.get("timestamp"),
                "categories": m.get("by_category") or {},
                "by_difficulty": m.get("by_difficulty") or {},
            }
        )
    reverse = sort.lower() != "asc"
    payload.sort(key=lambda x: x.get("accuracy") or 0, reverse=reverse)
    return payload


def build_stats(questions: list[dict[str, Any]], results: list[dict[str, Any]]) -> dict[str, Any]:
    models = latest_results_by_model(results)
    cats = {q.get("category") for q in questions if q.get("category")}
    langs = sorted({q.get("language") for q in questions if q.get("language")})
    scores = [m.get("accuracy") or 0 for m in models]
    top = models[0] if models else None
    last_updated = None
    if models:
        last_updated = (models[0].get("timestamp") or "")[:10] or None

    return {
        "total_questions": len(questions),
        "total_models": len(models),
        "categories": len(cats),
        "languages": langs,
        "top_score": top.get("accuracy") if top else None,
        "top_model": (top.get("model_label") or top.get("model")) if top else None,
        "average_score": round(sum(scores) / len(scores), 1) if scores else None,
        "last_updated": last_updated,
        "version": "0.1",
    }


def build_leaderboard(
    questions: list[dict[str, Any]], results: list[dict[str, Any]]
) -> dict[str, Any]:
    models = build_models_payload(results)
    # Moyennes par catégorie
    cat_scores: dict[str, list[float]] = {}
    for m in latest_results_by_model(results):
        for cat, info in (m.get("by_category") or {}).items():
            acc = info.get("accuracy")
            if acc is None:
                continue
            cat_scores.setdefault(cat, []).append(float(acc))

    category_averages = {
        cat: {
            "average": round(sum(vals) / len(vals), 1),
            "n_models": len(vals),
        }
        for cat, vals in sorted(cat_scores.items())
    }

    return {
        "models": models,
        "category_averages": category_averages,
        "stats": build_stats(questions, results),
    }


@lru_cache
def get_catalog() -> tuple[tuple[dict, ...], tuple[dict, ...]]:
    """Cache en mémoire (tuple immuable) — invalidable via clear_catalog_cache()."""
    questions = load_questions()
    results = load_results()
    return tuple(questions), tuple(results)


def clear_catalog_cache() -> None:
    get_catalog.cache_clear()


def get_questions() -> list[dict[str, Any]]:
    if get_settings().db_enabled:
        try:
            from app import repository

            return repository.list_questions()
        except Exception:  # noqa: BLE001 — DB indisponible → fallback fichiers
            pass
    return list(get_catalog()[0])


def get_results() -> list[dict[str, Any]]:
    if get_settings().db_enabled:
        try:
            from app import repository

            return repository.list_results()
        except Exception:  # noqa: BLE001 — DB indisponible → fallback fichiers
            pass
    return list(get_catalog()[1])
