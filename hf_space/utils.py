"""Chargement des résultats AfriBench pour le Space Gradio."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

import pandas as pd

# Dans le Space HF, les données sont copiées à côté de l'app.
# En local (monorepo) : remonter vers frontend/data/
SPACE_DIR = Path(__file__).resolve().parent
CANDIDATES = [
    SPACE_DIR / "data" / "results.json",
    SPACE_DIR.parent / "frontend" / "data" / "results.json",
    SPACE_DIR.parent / "data" / "hf" / "results.json",
]

QUESTION_CANDIDATES = [
    SPACE_DIR / "data" / "questions.json",
    SPACE_DIR.parent / "frontend" / "data" / "questions.json",
]

CATEGORY_LABELS = {
    "histoire": "Histoire",
    "geographie": "Géographie",
    "droit_politique": "Droit et Politique",
    "sante_sciences": "Santé et Sciences",
    "langue_culture": "Langue et Culture",
    "economie": "Économie",
    "ia_technologie": "IA et Technologie",
    "societe": "Société",
    "raisonnement_culturel": "Raisonnement Culturel",
}


def find_results_path() -> Path | None:
    for path in CANDIDATES:
        if path.exists():
            return path
    return None


@lru_cache
def load_raw_results() -> list[dict[str, Any]]:
    path = find_results_path()
    if path is None:
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        return [r for r in data if isinstance(r, dict)]
    return []


def latest_by_model(results: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    results = results if results is not None else load_raw_results()
    latest: dict[str, dict[str, Any]] = {}
    for r in sorted(results, key=lambda x: x.get("timestamp", ""), reverse=True):
        key = r.get("model") or r.get("model_label")
        if key and key not in latest:
            latest[key] = r
    return sorted(latest.values(), key=lambda m: m.get("accuracy") or 0, reverse=True)


def leaderboard_df(open_only: bool = False) -> pd.DataFrame:
    open_kw = ("llama", "qwen", "mistral", "gemma", "deepseek", "olmo", "phi", "bloom")
    rows = []
    for i, m in enumerate(latest_by_model(), 1):
        name = f"{m.get('model', '')} {m.get('model_label', '')}".lower()
        is_open = any(k in name for k in open_kw)
        if open_only and not is_open:
            continue
        best_cat, best_acc = "—", None
        for cat, info in (m.get("by_category") or {}).items():
            acc = info.get("accuracy")
            if acc is None:
                continue
            if best_acc is None or acc > best_acc:
                best_acc = acc
                best_cat = CATEGORY_LABELS.get(cat, cat)
        rows.append(
            {
                "Rang": i if not open_only else None,
                "Modèle": m.get("model_label") or m.get("model"),
                "Score (%)": m.get("accuracy"),
                "Correct": m.get("correct"),
                "Total": m.get("total"),
                "Meilleure catégorie": best_cat if best_acc is None else f"{best_cat} ({best_acc:.0f}%)",
                "Open weights": "oui" if is_open else "non",
                "Date": (m.get("timestamp") or "")[:10],
            }
        )
    df = pd.DataFrame(rows)
    if open_only and not df.empty:
        df = df.sort_values("Score (%)", ascending=False).reset_index(drop=True)
        df["Rang"] = df.index + 1
        cols = ["Rang"] + [c for c in df.columns if c != "Rang"]
        df = df[cols]
    return df


def category_matrix_df() -> pd.DataFrame:
    models = latest_by_model()
    cats = sorted({c for m in models for c in (m.get("by_category") or {})})
    rows = []
    for m in models:
        row = {"Modèle": m.get("model_label") or m.get("model")}
        for cat in cats:
            info = (m.get("by_category") or {}).get(cat) or {}
            row[CATEGORY_LABELS.get(cat, cat)] = info.get("accuracy")
        rows.append(row)
    return pd.DataFrame(rows)


def corpus_question_count() -> int | None:
    for path in QUESTION_CANDIDATES:
        if path.exists():
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, list):
                return len(data)
    return None


def stats_summary() -> dict[str, Any]:
    models = latest_by_model()
    scores = [m.get("accuracy") or 0 for m in models]
    eval_total = models[0].get("total") if models else 0
    corpus_n = corpus_question_count()
    seed_mismatch = bool(
        corpus_n and eval_total and isinstance(eval_total, int) and corpus_n != eval_total
    )
    return {
        "n_models": len(models),
        "n_questions": eval_total,
        "corpus_questions": corpus_n,
        "seed_mismatch": seed_mismatch,
        "top_model": (models[0].get("model_label") if models else "—"),
        "top_score": (models[0].get("accuracy") if models else None),
        "avg_score": round(sum(scores) / len(scores), 1) if scores else None,
    }
