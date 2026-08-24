"""Chargement des tâches ouvertes et traductions AfriBench."""

from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.config import REPO_ROOT, Settings, get_settings

logger = logging.getLogger("afribench")

OPEN_DIR = REPO_ROOT / "data" / "questions" / "v1" / "open"
TRANSLATIONS_DIR = REPO_ROOT / "data" / "questions" / "v1" / "translations"
OPEN_SCORES_CANDIDATES = [
    REPO_ROOT / "data" / "results" / "open_scores.json",
    REPO_ROOT / "frontend" / "data" / "open_scores.json",
]

TASK_FILES = {
    "open_generation": "open_v1.json",
    "open_qa": "open_qa_v1.json",
    "translation": "translation_v1.json",
    "summarization": "summarization_v1.json",
    "ner": "ner_v1.json",
    "sentiment": "sentiment_v1.json",
}


def _read_json(path: Path) -> Any:
    """Lit un fichier JSON, ou renvoie None s'il est illisible (cf. data_loader)."""
    try:
        with path.open(encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError, UnicodeDecodeError) as exc:
        logger.error("Fichier de données illisible, ignoré : %s — %s", path, exc)
        return None


def load_open_tasks(task_type: str | None = None) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for task, fname in TASK_FILES.items():
        if task_type and task != task_type:
            continue
        path = OPEN_DIR / fname
        if path.exists():
            data = _read_json(path)
            if isinstance(data, list):
                items.extend(data)
    return items


def load_translations(lang: str, *, verified_only: bool = False) -> list[dict[str, Any]]:
    folder = TRANSLATIONS_DIR / lang
    if not folder.exists():
        return []
    items: list[dict[str, Any]] = []
    for path in sorted(folder.glob("*.json")):
        data = _read_json(path)
        if isinstance(data, list):
            items.extend(data)
    if verified_only:
        items = [q for q in items if q.get("translation_status") == "verified"]
    return items


def load_translation_manifest() -> dict[str, Any]:
    langs = {}
    for lang in ("sw", "yo", "am"):
        items = load_translations(lang)
        verified = [q for q in items if q.get("translation_status") == "verified"]
        langs[lang] = {
            "total": len(items),
            "verified": len(verified),
            "official": len(verified) >= 50,
        }
    return {"langs": langs, "official": any(v["official"] for v in langs.values())}


@lru_cache
def load_open_scores() -> dict[str, Any]:
    for path in OPEN_SCORES_CANDIDATES:
        if path.exists():
            data = _read_json(path)
            if isinstance(data, dict):
                return data
    return {"dry_run": True, "tasks": {}, "models": []}


def build_validation_status(settings: Settings | None = None) -> dict[str, Any]:
    settings = settings or get_settings()
    questions: list[dict] = []
    qdir = settings.questions_dir
    if qdir.exists():
        for fpath in sorted(qdir.glob("*.json")):
            if fpath.name == "template.json":
                continue
            data = _read_json(fpath)
            if isinstance(data, list):
                questions.extend(data)
    total = len(questions)
    validated = [q for q in questions if q.get("validated_by")]
    pct = round(100 * len(validated) / total, 1) if total else 0.0
    return {
        "total_questions": total,
        "validated_count": len(validated),
        "validated_pct": pct,
        "target_validators": 3,
        "validators_seen": sorted({q.get("validated_by") for q in validated if q.get("validated_by")}),
    }
