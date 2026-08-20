#!/usr/bin/env python3
"""Analyse statistique des résultats AfriBench (bootstrap IC + McNemar).

Usage:
  python scripts/stats_analysis.py
  python scripts/stats_analysis.py --results data/results/_seed_v0.1.json --out data/stats/seed_report.json
  python scripts/stats_analysis.py --include-mock
"""

from __future__ import annotations

import argparse
import json
import math
import random
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parent.parent
RESULTS_DIR = REPO / "data" / "results"
DEFAULT_OUT = REPO / "data" / "stats" / "report.json"


def load_results(path: Path | None, include_mock: bool) -> list[dict]:
    items: list[dict] = []
    if path:
        data = json.loads(path.read_text(encoding="utf-8"))
        items = data if isinstance(data, list) else [data]
    else:
        for fpath in sorted(RESULTS_DIR.glob("*.json")):
            data = json.loads(fpath.read_text(encoding="utf-8"))
            if isinstance(data, list):
                items.extend(data)
            elif isinstance(data, dict):
                items.append(data)
        if include_mock:
            mock = RESULTS_DIR / "mock"
            if mock.exists():
                for fpath in sorted(mock.glob("*.json")):
                    items.append(json.loads(fpath.read_text(encoding="utf-8")))
    return [r for r in items if isinstance(r, dict) and r.get("details")]


def latest_by_model(results: list[dict]) -> dict[str, dict]:
    latest: dict[str, dict] = {}
    for r in sorted(results, key=lambda x: x.get("timestamp", ""), reverse=True):
        key = r.get("model") or r.get("model_label")
        if key and key not in latest:
            latest[key] = r
    return latest


def bootstrap_ci(
    correct_flags: list[bool], n_boot: int = 2000, alpha: float = 0.05, seed: int = 42
) -> dict[str, float]:
    rng = random.Random(seed)
    n = len(correct_flags)
    if n == 0:
        return {"accuracy": 0.0, "ci_low": 0.0, "ci_high": 0.0, "n": 0}
    point = sum(correct_flags) / n * 100
    samples = []
    for _ in range(n_boot):
        draws = [correct_flags[rng.randrange(n)] for _ in range(n)]
        samples.append(sum(draws) / n * 100)
    samples.sort()
    lo = samples[int((alpha / 2) * n_boot)]
    hi = samples[int((1 - alpha / 2) * n_boot) - 1]
    return {
        "accuracy": round(point, 2),
        "ci_low": round(lo, 2),
        "ci_high": round(hi, 2),
        "n": n,
    }


def mcnemar_pair(a: dict, b: dict) -> dict[str, Any] | None:
    """McNemar exact mid-p approximation on intersecting question ids."""
    da = {d["id"]: bool(d.get("correct")) for d in a.get("details") or [] if d.get("id")}
    db = {d["id"]: bool(d.get("correct")) for d in b.get("details") or [] if d.get("id")}
    common = sorted(set(da) & set(db))
    if not common:
        return None
    b01 = b10 = 0  # a wrong b right / a right b wrong
    for qid in common:
        if da[qid] and not db[qid]:
            b10 += 1
        elif (not da[qid]) and db[qid]:
            b01 += 1
    discordant = b01 + b10
    # Continuity-corrected chi-square / exact binomial mid-p approx
    if discordant == 0:
        p = 1.0
        stat = 0.0
    else:
        stat = (abs(b01 - b10) - 1) ** 2 / discordant
        # two-sided binomial mid-p under p=0.5
        k = min(b01, b10)
        # P(X<=k) + P(X>=n-k) with mid-p correction on equality term
        from math import comb

        n = discordant
        cdf = sum(comb(n, i) for i in range(0, k + 1)) / (2**n)
        # two-sided
        p = min(1.0, 2 * cdf)
        # mid-p: subtract half the equality mass
        p = max(0.0, p - comb(n, k) / (2**n))
    return {
        "n_common": len(common),
        "b01_a_wrong_b_right": b01,
        "b10_a_right_b_wrong": b10,
        "chi2_cc": round(stat, 4),
        "p_approx": round(p, 6),
        "significant_0.05": p < 0.05,
    }


def analyze(results: list[dict], n_boot: int) -> dict[str, Any]:
    latest = latest_by_model(results)
    models_report = {}
    for name, r in latest.items():
        flags = [bool(d.get("correct")) for d in r.get("details") or []]
        by_cat: dict[str, list[bool]] = defaultdict(list)
        for d in r.get("details") or []:
            by_cat[d.get("category", "unknown")].append(bool(d.get("correct")))
        models_report[name] = {
            "label": r.get("model_label") or name,
            "total": r.get("total"),
            "mock": bool(r.get("mock")),
            "overall": bootstrap_ci(flags, n_boot=n_boot, seed=hash(name) % 10_000),
            "by_category": {
                cat: bootstrap_ci(flags_c, n_boot=max(500, n_boot // 2), seed=hash(name + cat) % 10_000)
                for cat, flags_c in sorted(by_cat.items())
            },
        }

    names = sorted(latest.keys())
    pairs = {}
    for i, a in enumerate(names):
        for b in names[i + 1 :]:
            pair = mcnemar_pair(latest[a], latest[b])
            if pair:
                pairs[f"{a}__vs__{b}"] = pair

    # Overlapping CI warning for top-2
    ranked = sorted(
        models_report.items(),
        key=lambda kv: kv[1]["overall"]["accuracy"],
        reverse=True,
    )
    top_note = None
    if len(ranked) >= 2:
        a, b = ranked[0][1]["overall"], ranked[1][1]["overall"]
        overlap = not (a["ci_high"] < b["ci_low"] or b["ci_high"] < a["ci_low"])
        top_note = {
            "top": ranked[0][0],
            "second": ranked[1][0],
            "ci_overlap": overlap,
            "message": (
                "Les IC 95% des deux premiers se chevauchent — écart non concluant."
                if overlap
                else "IC 95% des deux premiers ne se chevauchent pas."
            ),
        }

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "n_models": len(models_report),
        "models": models_report,
        "mcnemar_pairs": pairs,
        "top_comparison": top_note,
    }


def print_summary(report: dict) -> None:
    print("\nAfriBench — stats (bootstrap 95% CI)")
    print("=" * 60)
    for name, info in sorted(
        report["models"].items(),
        key=lambda kv: kv[1]["overall"]["accuracy"],
        reverse=True,
    ):
        o = info["overall"]
        tag = " [mock]" if info.get("mock") else ""
        print(
            f"  {info['label']:<28} {o['accuracy']:>5.1f}% "
            f"[{o['ci_low']:.1f}, {o['ci_high']:.1f}]  n={o['n']}{tag}"
        )
    if report.get("top_comparison"):
        print("\n" + report["top_comparison"]["message"])
    sig = [k for k, v in report.get("mcnemar_pairs", {}).items() if v.get("significant_0.05")]
    print(f"\nPaires McNemar significatives (p<0.05) : {len(sig)}/{len(report.get('mcnemar_pairs', {}))}")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--results", type=Path, help="Fichier JSON results (liste ou objet)")
    p.add_argument("--include-mock", action="store_true")
    p.add_argument("--n-boot", type=int, default=2000)
    p.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = p.parse_args()

    results = load_results(args.results, args.include_mock)
    if not results:
        raise SystemExit("Aucun résultat avec details[] trouvé.")
    report = analyze(results, n_boot=args.n_boot)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print_summary(report)
    print(f"\nRapport → {args.out}")


if __name__ == "__main__":
    main()
