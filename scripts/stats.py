#!/usr/bin/env python3
"""
stats.py — Analyse statistique des résultats AfriBench.
------------------------------------------------------
Donne des barres d'erreur et des tests de significativité aux scores, pour
éviter de sur-interpréter des écarts qui tiennent dans le bruit d'échantillon
(~101-189 questions). Lit les fichiers de résultats produits par
`afribench.py run` (data/results/*.json) — AUCUN appel API.

Sous-commandes :
  bootstrap        IC 95 % (rééchantillonnage sur les questions), global + par
                   catégorie, pour chaque modèle.
  mcnemar          (à venir) test de McNemar par paire de modèles.
  nondiscriminant  (à venir) questions où tous les modèles répondent pareil.

Sorties : JSON + CSV dans data/results/stats/ + un tableau lisible en stdout.

Usage :
  python scripts/stats.py bootstrap
  python scripts/stats.py bootstrap --results data/results/ --iterations 5000
  python scripts/stats.py bootstrap --results monfichier.json --model gpt-4o
"""

import argparse
import csv
import json
import sys
from datetime import datetime
from pathlib import Path

import numpy as np
from scipy.stats import binomtest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import afribench as ab  # noqa: E402

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:  # noqa: BLE001
        pass

REPO_ROOT = Path(__file__).resolve().parent.parent
STATS_DIR = REPO_ROOT / "data" / "results" / "stats"


# ── Chargement des résultats ─────────────────────────────────────────────
def load_result_files(path: str | None) -> list[dict]:
    """Charge les résultats QCM (avec `details` par question) depuis un fichier
    ou un dossier. Ignore les résultats ouverts (eval_type=open) et sans détails."""
    p = Path(path) if path else ab.RESULTS_DIR
    if not p.exists():
        print(f"Introuvable : {p}")
        sys.exit(1)
    files = [p] if p.is_file() else sorted(p.glob("*.json"))
    out = []
    for f in files:
        try:
            d = json.loads(Path(f).read_text(encoding="utf-8"))
        except Exception as e:  # noqa: BLE001
            print(f"  (ignoré, JSON invalide : {f.name} — {e})")
            continue
        d = adapt_permute_report(d)
        if d.get("eval_type", "mcq") != "mcq":
            continue
        if not isinstance(d.get("details"), list) or not d["details"]:
            continue
        out.append(d)
    return out


def adapt_permute_report(d: dict) -> dict:
    """Convertit un rapport `contamination permute` en résultat QCM exploitable :
    la précision sur l'ordre ORIGINAL (identité = 1re permutation) sert de
    correctness par question. Évite un `afribench.py run` complet (quota)."""
    if d.get("analysis") != "option_order_probe":
        return d
    details = []
    for x in d.get("details", []):
        ppc = x.get("per_perm_correct") or []
        if not ppc or ppc[0] is None:  # appel en erreur -> exclu du bootstrap
            continue
        details.append({"id": x.get("id"), "category": x.get("category"),
                        "correct": bool(ppc[0])})
    return {
        "eval_type": "mcq",
        "model": d.get("model"),
        "model_label": d.get("model_label", d.get("model")),
        "timestamp": d.get("timestamp", ""),
        "details": details,
    }


def latest_by_model(results: list[dict]) -> dict:
    latest = {}
    for r in results:
        name = r.get("model", "?")
        if name not in latest or r.get("timestamp", "") > latest[name].get("timestamp", ""):
            latest[name] = r
    return latest


# ── Bootstrap ────────────────────────────────────────────────────────────
def bootstrap_ci(correctness: list[int], iterations: int, seed: int):
    """IC 95 % percentile de la moyenne (précision) par rééchantillonnage.
    Retourne (moyenne_%, borne_basse_%, borne_haute_%). Seed fixée."""
    arr = np.asarray(correctness, dtype=float)
    n = len(arr)
    if n == 0:
        return 0.0, 0.0, 0.0
    rng = np.random.default_rng(seed)
    # matrice (iterations x n) d'indices tirés avec remise
    idx = rng.integers(0, n, size=(iterations, n))
    means = arr[idx].mean(axis=1)
    lo, hi = np.percentile(means, [2.5, 97.5])
    return round(float(arr.mean()) * 100, 1), round(float(lo) * 100, 1), round(float(hi) * 100, 1)


def wilson_ci(correct: int, n: int):
    """IC 95 % de Wilson (binomial). Contrairement au bootstrap percentile, il
    reste informatif aux bords (6/6 -> ~[61 – 100], pas [100 – 100])."""
    if n == 0:
        return 0.0, 0.0
    ci = binomtest(correct, n).proportion_ci(confidence_level=0.95, method="wilson")
    return round(ci.low * 100, 1), round(ci.high * 100, 1)


def analyse_model(result: dict, iterations: int, seed: int) -> dict:
    details = result["details"]
    overall = [1 if d.get("correct") else 0 for d in details]
    by_cat_mask: dict[str, list[int]] = {}
    for d in details:
        by_cat_mask.setdefault(d.get("category", "unknown"), []).append(
            1 if d.get("correct") else 0)

    acc, lo, hi = bootstrap_ci(overall, iterations, seed)
    wlo, whi = wilson_ci(sum(overall), len(overall))
    entry = {
        "model": result.get("model"),
        "model_label": result.get("model_label", result.get("model")),
        "n": len(overall),
        "accuracy": acc,
        "ci_low": lo,
        "ci_high": hi,
        "wilson_low": wlo,
        "wilson_high": whi,
        "by_category": {},
    }
    # Seed dérivée par catégorie (déterministe) pour des IC reproductibles.
    for j, (cat, mask) in enumerate(sorted(by_cat_mask.items())):
        cacc, clo, chi = bootstrap_ci(mask, iterations, seed + j + 1)
        cwlo, cwhi = wilson_ci(sum(mask), len(mask))
        entry["by_category"][cat] = {"n": len(mask), "accuracy": cacc,
                                     "ci_low": clo, "ci_high": chi,
                                     "wilson_low": cwlo, "wilson_high": cwhi}
    return entry


def save_outputs(report: dict):
    STATS_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    json_path = STATS_DIR / f"bootstrap_{ts}.json"
    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    csv_path = STATS_DIR / f"bootstrap_{ts}.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["model", "scope", "n", "accuracy",
                    "boot_low", "boot_high", "wilson_low", "wilson_high"])
        for m in report["models"]:
            w.writerow([m["model_label"], "overall", m["n"], m["accuracy"],
                        m["ci_low"], m["ci_high"], m["wilson_low"], m["wilson_high"]])
            for cat, c in m["by_category"].items():
                w.writerow([m["model_label"], cat, c["n"], c["accuracy"],
                            c["ci_low"], c["ci_high"], c["wilson_low"], c["wilson_high"]])
    return json_path, csv_path


def print_summary(report: dict):
    print(f"\n{'='*66}")
    print(f"  Bootstrap IC 95 %  (B={report['iterations']}, seed={report['seed']})")
    print(f"{'='*66}")
    print(f"  IC affichés : bootstrap percentile  |  Wilson (robuste aux bords)")
    for m in sorted(report["models"], key=lambda x: -x["accuracy"]):
        print(f"\n  {m['model_label']}  (n={m['n']})")
        print(f"    Global : {m['accuracy']:.1f}%   boot [{m['ci_low']:.1f} – {m['ci_high']:.1f}]"
              f"   Wilson [{m['wilson_low']:.1f} – {m['wilson_high']:.1f}]")
        for cat, c in sorted(m["by_category"].items()):
            width = c["wilson_high"] - c["wilson_low"]
            note = "  <-- incertain" if width >= 30 else ""
            print(f"      {cat:<22} {c['accuracy']:>5.1f}%  "
                  f"boot [{c['ci_low']:>5.1f}–{c['ci_high']:>5.1f}]  "
                  f"Wilson [{c['wilson_low']:>5.1f}–{c['wilson_high']:>5.1f}]  n={c['n']}{note}")
    print(f"\n  Lecture : au bord (100 %/0 %) le bootstrap s'effondre (ex. 6/6 -> [100–100])")
    print(f"  alors que Wilson garde une vraie incertitude (6/6 -> ~[61–100]). Fiez-vous à")
    print(f"  Wilson pour les catégories à 100 %. Deux modèles aux IC très chevauchants ne")
    print(f"  sont pas distinguables sur cet échantillon.")


def cmd_bootstrap(args):
    results = load_result_files(args.results)
    if not results:
        print("Aucun résultat QCM exploitable (fichiers avec `details` par question).")
        print("Lancez d'abord : python scripts/afribench.py run   (génère data/results/*.json)")
        sys.exit(1)
    latest = latest_by_model(results)
    if args.model:
        latest = {k: v for k, v in latest.items() if k == args.model}
        if not latest:
            print(f"Modèle '{args.model}' absent des résultats.")
            sys.exit(1)

    report = {
        "analysis": "bootstrap_ci",
        "generated_at": datetime.now().isoformat(),
        "iterations": args.iterations,
        "seed": args.seed,
        "models": [analyse_model(r, args.iterations, args.seed)
                   for r in latest.values()],
    }
    json_path, csv_path = save_outputs(report)
    print_summary(report)
    print(f"\n  Rapports : {json_path}")
    print(f"             {csv_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Analyse statistique des résultats AfriBench")
    sub = parser.add_subparsers(dest="command", required=True)

    p_bs = sub.add_parser("bootstrap", help="IC 95 % bootstrap (2.1)")
    p_bs.add_argument("--results", "-r", default=None,
                      help="Fichier ou dossier de résultats (défaut : data/results/)")
    p_bs.add_argument("--iterations", "-B", type=int, default=2000,
                      help="Nb de rééchantillonnages bootstrap (défaut : 2000)")
    p_bs.add_argument("--seed", type=int, default=42, help="Graine (reproductibilité)")
    p_bs.add_argument("--model", "-m", help="Restreindre à un modèle")
    p_bs.set_defaults(func=cmd_bootstrap)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
