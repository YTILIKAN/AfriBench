#!/usr/bin/env python3
"""Pré-génère du HTML statique pour les crawlers (plus de 'Chargement...' seul).

- Injecte un classement minimal dans `#tab-content` (marqueurs STATIC_*)
- Enrichit le `<noscript>`
- Écrit `frontend/data/bootstrap.json` (results + questions légers)

Usage:
  python scripts/export_frontend.py
  python scripts/generate_static_html.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
FRONTEND = REPO_ROOT / "frontend"
INDEX = FRONTEND / "index.html"
RESULTS = FRONTEND / "data" / "results.json"
QUESTIONS = FRONTEND / "data" / "questions.json"
BOOTSTRAP = FRONTEND / "data" / "bootstrap.json"

BEGIN = "<!-- STATIC_LEADERBOARD_BEGIN -->"
END = "<!-- STATIC_LEADERBOARD_END -->"


def latest_models(results: list[dict]) -> list[dict]:
    latest: dict[str, dict] = {}
    for r in sorted(results, key=lambda x: x.get("timestamp", ""), reverse=True):
        key = r.get("model") or r.get("model_label")
        if key and key not in latest:
            latest[key] = r
    return sorted(latest.values(), key=lambda m: m.get("accuracy") or 0, reverse=True)


def render_table(models: list[dict], questions_count: int) -> str:
    rows = []
    result_totals = {
        m.get("total") for m in models if isinstance(m.get("total"), int)
    }
    seed_note = ""
    if result_totals and questions_count and result_totals != {questions_count}:
        shown = ", ".join(str(t) for t in sorted(result_totals))
        seed_note = (
            f" Scores publics encore basés sur {shown} questions (seed) — "
            f"corpus actuel : {questions_count}."
        )
    for i, m in enumerate(models[:15], 1):
        label = m.get("model_label") or m.get("model") or "?"
        acc = m.get("accuracy")
        acc_s = f"{acc:.1f}%" if isinstance(acc, (int, float)) else "—"
        correct = m.get("correct", "—")
        total = m.get("total", "—")
        rows.append(
            f"<tr><td>{i}</td><td>{_esc(label)}</td>"
            f"<td>{acc_s}</td><td>{correct}/{total}</td></tr>"
        )
    body = "\n".join(rows) if rows else "<tr><td colspan='4'>Aucun résultat</td></tr>"
    return f"""{BEGIN}
            <div class="card" id="static-leaderboard">
              <div class="card-title">Classement (v0.1 — indicatif)</div>
              <p style="font-size:.85rem;color:var(--muted);margin-bottom:12px">
                Contenu pré-généré pour les moteurs de recherche et lecteurs sans JavaScript.
                {questions_count} questions · {len(models)} modèles.{seed_note}
              </p>
              <div class="lb-table-wrap">
                <table class="lb-table">
                  <thead><tr><th>#</th><th>Modèle</th><th>Score</th><th>Détail</th></tr></thead>
                  <tbody>
{body}
                  </tbody>
                </table>
              </div>
            </div>
            {END}"""


def _esc(s: str) -> str:
    return (
        str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def inject_index(html: str, block: str) -> str:
    if BEGIN in html and END in html:
        pattern = re.compile(
            re.escape(BEGIN) + r".*?" + re.escape(END),
            re.DOTALL,
        )
        return pattern.sub(block, html)

    # Première génération : remplacer le placeholder Chargement...
    placeholder = re.compile(
        r'<main class="content-area" id="tab-content"[^>]*>.*?</main>',
        re.DOTALL,
    )
    replacement = f'<main class="content-area" id="tab-content" role="tabpanel">\n{block}\n          </main>'
    new_html, n = placeholder.subn(replacement, html, count=1)
    if n != 1:
        print("Impossible de trouver #tab-content dans index.html", file=sys.stderr)
        sys.exit(1)
    return new_html


def enrich_noscript(html: str, models: list[dict], qcount: int) -> str:
    items = "".join(
        f"<li>{_esc(m.get('model_label') or m.get('model'))} — {m.get('accuracy', '—')}%</li>"
        for m in models[:7]
    )
    noscript = f"""  <noscript>
    <div style="background:#0A0806;color:#FAF9F6;padding:40px;text-align:center;font-family:sans-serif">
      <h2>AfriBench — Prototype v0.1</h2>
      <p>JavaScript est recommandé pour l'expérience complète. Aperçu du classement ({qcount} questions) :</p>
      <ol style="display:inline-block;text-align:left">{items or "<li>Aucun résultat</li>"}</ol>
      <p>Données : <a href="data/results.json" style="color:#FFA726">results.json</a> ·
      <a href="data/questions.json" style="color:#FFA726">questions.json</a> ·
      <a href="https://github.com/YTILIKAN/AfriBench" style="color:#FFA726">GitHub</a></p>
    </div>
  </noscript>"""
    return re.sub(r"<noscript>.*?</noscript>", noscript, html, count=1, flags=re.DOTALL)


def main() -> None:
    results = json.loads(RESULTS.read_text(encoding="utf-8")) if RESULTS.exists() else []
    questions = json.loads(QUESTIONS.read_text(encoding="utf-8")) if QUESTIONS.exists() else []
    models = latest_models(results if isinstance(results, list) else [])
    qcount = len(questions) if isinstance(questions, list) else 0

    # Bootstrap léger (sans details[] pour limiter la taille)
    light_results = [{k: v for k, v in r.items() if k != "details"} for r in (results or [])]
    BOOTSTRAP.write_text(
        json.dumps(
            {"results": light_results, "questions": questions, "generated": True},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Bootstrap → {BOOTSTRAP} ({len(light_results)} results, {qcount} questions)")

    block = render_table(models, qcount)
    html = INDEX.read_text(encoding="utf-8")
    html = inject_index(html, block)
    html = enrich_noscript(html, models, qcount)
    INDEX.write_text(html, encoding="utf-8")
    print(f"Static leaderboard injecté dans {INDEX}")


if __name__ == "__main__":
    main()
