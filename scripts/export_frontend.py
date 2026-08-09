#!/usr/bin/env python3
"""Exporte les donnees du benchmark pour le frontend statique.

Usage:
    python scripts/export_frontend.py
    # Cree frontend/data/results.json et frontend/data/questions.json
"""

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data"
QUESTIONS_DIR = DATA_DIR / "questions" / "v1" / "validated"
RESULTS_DIR = DATA_DIR / "results"
FRONTEND_DATA = REPO_ROOT / "frontend" / "data"


def export_questions():
    """Compile toutes les questions validees en un seul fichier JSON."""
    all_qs = []
    if QUESTIONS_DIR.exists():
        for fpath in sorted(QUESTIONS_DIR.glob("*.json")):
            if fpath.name == "template.json":
                continue
            with open(fpath, encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    all_qs.extend(data)
                else:
                    all_qs.append(data)

    # Ajoute les infos de categorie et difficulte pour le filtrage
    FRONTEND_DATA.mkdir(parents=True, exist_ok=True)
    out_path = FRONTEND_DATA / "questions.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(all_qs, f, indent=2, ensure_ascii=False)

    print(f"Questions exportees : {len(all_qs)} -> {out_path}")


def _load_json_files(paths):
    """Charge une liste de fichiers JSON en ignorant les invalides."""
    out = []
    for fpath in paths:
        try:
            with open(fpath, encoding="utf-8") as f:
                out.append(json.load(f))
        except json.JSONDecodeError:
            print(f"  Ignore (JSON invalide) : {fpath.name}", file=sys.stderr)
    return out


def _latest_by(items, key_fn, ts_fn):
    """Garde le plus récent par clé (dict ordonné insertion)."""
    latest = {}
    for it in items:
        k = key_fn(it)
        if k not in latest or ts_fn(it) > ts_fn(latest[k]):
            latest[k] = it
    return list(latest.values())


def _write(name, payload, label):
    FRONTEND_DATA.mkdir(parents=True, exist_ok=True)
    out_path = FRONTEND_DATA / name
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    print(f"{label} -> {out_path}")


def export_results():
    """Compile les resultats QCM (eval_type != open) en un seul fichier JSON."""
    all_results = []
    if RESULTS_DIR.exists():
        for r in _load_json_files(sorted(RESULTS_DIR.glob("*.json"))):
            if r.get("eval_type") == "open":  # les scores ouverts ont leur propre fichier
                continue
            all_results.append(r)

    all_results.sort(key=lambda r: r.get("timestamp", ""), reverse=True)

    FRONTEND_DATA.mkdir(parents=True, exist_ok=True)
    out_path = FRONTEND_DATA / "results.json"

    if not all_results and out_path.exists():
        with open(out_path, encoding="utf-8") as f:
            existing = json.load(f)
        if existing:
            print(f"  Preserve existing ({len(existing)} resultats)")
            return

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(all_results[:100], f, indent=2, ensure_ascii=False)
    print(f"Resultats QCM exportes : {len(all_results)} -> {out_path}")


def export_open_scores():
    """Scores des questions OUVERTES (LLM-as-judge) -> open_scores.json."""
    files = sorted(RESULTS_DIR.glob("*_open_*.json")) if RESULTS_DIR.exists() else []
    reports = _load_json_files(files)
    latest = _latest_by(reports, lambda r: r.get("model"), lambda r: r.get("timestamp", ""))
    out = [{
        "model": r.get("model"),
        "model_label": r.get("model_label", r.get("model")),
        "mean_score": r.get("mean_score"),
        "scored": r.get("scored"),
        "total": r.get("total"),
        "judge_version": r.get("judge_version"),
        "judge_model": r.get("judge_model"),
        "by_category": {c: {"mean_score": v.get("mean_score"), "n": v.get("n")}
                        for c, v in (r.get("by_category") or {}).items()},
        "timestamp": r.get("timestamp"),
    } for r in latest]
    out.sort(key=lambda x: -(x["mean_score"] or 0))
    _write("open_scores.json", out, f"Scores ouverts exportes : {len(out)} modele(s)")


def export_contamination():
    """Rapports de contamination (noise + permute) -> contamination.json."""
    cdir = RESULTS_DIR / "contamination"
    reports = _load_json_files(sorted(cdir.glob("*.json"))) if cdir.exists() else []
    noise = [r for r in reports if r.get("analysis") == "api_baseline_noise"]
    permute = [r for r in reports if r.get("analysis") == "option_order_probe"]

    def strip(r):  # on retire les details[] volumineux
        return {k: v for k, v in r.items() if k != "details"}

    payload = {
        "noise": [strip(r) for r in _latest_by(noise, lambda r: r.get("model"), lambda r: r.get("timestamp", ""))],
        "permute": [strip(r) for r in _latest_by(permute, lambda r: r.get("model"), lambda r: r.get("timestamp", ""))],
    }
    _write("contamination.json", payload,
           f"Contamination exportee : {len(payload['noise'])} noise, {len(payload['permute'])} permute")


def export_stats():
    """Dernier rapport bootstrap (IC) -> stats.json."""
    sdir = RESULTS_DIR / "stats"
    reports = _load_json_files(sorted(sdir.glob("bootstrap_*.json"))) if sdir.exists() else []
    if not reports:
        _write("stats.json", {"models": []}, "Stats exportees : (aucun rapport bootstrap)")
        return
    latest = max(reports, key=lambda r: r.get("generated_at", ""))
    _write("stats.json", latest, f"Stats exportees : {len(latest.get('models', []))} modele(s)")


def main():
    print("Export des donnees pour le frontend...")
    export_questions()
    export_results()
    export_open_scores()
    export_contamination()
    export_stats()
    print("Termine. Lancez le frontend :")
    print("  cd frontend && python -m http.server 8000")


if __name__ == "__main__":
    main()
