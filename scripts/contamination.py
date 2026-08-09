#!/usr/bin/env python3
"""
contamination.py — Détection de contamination pour AfriBench.
------------------------------------------------------------
Outils d'audit pour repérer les signaux de mémorisation / contamination du
benchmark (scores plafonnés à 90-96 %, catégories à 100 %). Chaque analyse est
une fonction indépendante exposée en sous-commande CLI.

Ce module NE réimplémente PAS l'inférence : il réutilise strictement la couche
de chargement et d'appel des modèles de `scripts/afribench.py` (mêmes providers,
même température 0.0, même parsing de réponse). Aucun endpoint deviné.

Sous-commandes :
  permute    Option-order probe (1.1) — ré-évalue chaque question avec l'ordre
             A/B/C/D permuté et mesure la STABILITÉ de la réponse. Un taux de
             "flip" élevé sur une catégorie à 100 % = mémorisation positionnelle.
  canary     (à venir) insertion/vérification de chaînes témoins.
  minkprob   (à venir, si log-probs dispo) Min-K% Prob.

Sorties : un rapport JSON dans data/results/contamination/ + un résumé stdout.

Usage :
  python scripts/contamination.py permute --model gpt-4o
  python scripts/contamination.py permute --model gemini-2.5-flash-lite \
      --limit 20 --permutations 3 --seed 42 --delay 5
"""

import argparse
import json
import random
import re
import sys
import time
from datetime import datetime
from pathlib import Path

# Réutilise la couche chargement/inférence d'afribench.py (import module).
sys.path.insert(0, str(Path(__file__).resolve().parent))
import afribench as ab  # noqa: E402

# Sous Windows, éviter les plantages cp1252 sur les emojis / accents.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:  # noqa: BLE001
        pass

REPO_ROOT = Path(__file__).resolve().parent.parent
CONTAM_DIR = REPO_ROOT / "data" / "results" / "contamination"


def redact_secrets(text) -> str:
    """Masque les clés API (Gemini les place dans l'URL) dans les messages."""
    return re.sub(r"(key=)[A-Za-z0-9_\-]+", r"\1***", str(text))


# ── Inférence (réutilise afribench) ──────────────────────────────────────
def infer_letter(model: dict, question: dict, retries: int = 3):
    """Appelle le modèle sur une question QCM, retourne (lettre|None, erreur|None)."""
    provider_fn = ab.PROVIDERS.get(model["provider"])
    if not provider_fn:
        raise ValueError(f"Provider inconnu : {model['provider']}")
    prompt = ab.build_prompt(question)
    last_err = None
    for attempt in range(retries):
        try:
            raw = provider_fn(model, prompt)
            return ab.extract_answer(raw), None
        except Exception as e:  # noqa: BLE001
            last_err = redact_secrets(e)
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
    return None, last_err


# ── Sélection des questions ──────────────────────────────────────────────
def select_questions(questions: list[dict], categories: list[str] | None = None,
                     per_category: int = 0, limit: int = 0) -> list[dict]:
    """Filtre les questions QCM éligibles, éventuellement par catégorie, et
    échantillonne de façon reproductible (tri par id, pas d'aléa)."""
    qs = [q for q in questions
          if q.get("type") != "open" and q.get("options") and q.get("answer")]
    if categories:
        cats = set(categories)
        qs = [q for q in qs if q.get("category") in cats]
    qs = sorted(qs, key=lambda q: str(q.get("id", "")))
    if per_category:
        seen: dict[str, int] = {}
        out = []
        for q in qs:
            c = q.get("category", "unknown")
            if seen.get(c, 0) < per_category:
                out.append(q)
                seen[c] = seen.get(c, 0) + 1
        return out
    if limit:
        return qs[:limit]
    return qs


# ── Permutations ─────────────────────────────────────────────────────────
def gen_permutations(n: int, k: int, rng: random.Random) -> list[list[int]]:
    """k permutations DISTINCTES de range(n), toutes différentes de l'identité."""
    identity = tuple(range(n))
    seen = {identity}
    out = []
    tries = 0
    # n! - 1 permutations non-identité disponibles au plus
    max_available = 1
    for i in range(1, n + 1):
        max_available *= i
    max_available -= 1
    target = min(k, max_available)
    while len(out) < target and tries < 2000:
        p = list(range(n))
        rng.shuffle(p)
        if tuple(p) not in seen:
            seen.add(tuple(p))
            out.append(p)
        tries += 1
    return out


def permuted_question(question: dict, perm: list[int]):
    """Réordonne les CONTENUS des options selon perm, en gardant les positions
    A/B/C/D. Retourne (question_permutée, lettre_correcte, contenu_correct)."""
    letters = list(question["options"].keys())
    contents = list(question["options"].values())
    new_opts = {letters[i]: contents[perm[i]] for i in range(len(letters))}

    orig_answer = question.get("answer")
    correct_content = question["options"].get(orig_answer)
    new_answer = None
    for i in range(len(letters)):
        if contents[perm[i]] == correct_content:
            new_answer = letters[i]
            break

    q2 = dict(question)
    q2["options"] = new_opts
    q2["answer"] = new_answer
    return q2, new_answer, correct_content


# ── Analyse 1.1 : option-order probe ─────────────────────────────────────
def run_permute(model: dict, questions: list[dict], permutations: int,
                seed: int, delay: float, verbose: bool) -> dict:
    """Ré-évalue chaque question avec l'ordre original + N permutations et
    mesure la stabilité (flip) de la réponse du modèle."""
    rng = random.Random(seed)

    results = {
        "analysis": "option_order_probe",
        "model": model["name"],
        "model_label": model.get("label", model["name"]),
        "timestamp": datetime.now().isoformat(),
        "seed": seed,
        "permutations": permutations,
        "total": len(questions),
        "evaluated": 0,
        "errors": 0,
        "by_category": {},
        "details": [],
    }

    orig_correct = 0
    perm_correct_sum = 0
    perm_eval_sum = 0
    flips = 0

    for i, q in enumerate(questions):
        if delay and i > 0:
            time.sleep(delay)

        cat = q.get("category", "unknown")
        # Une permutation d'options exige des options + une bonne réponse connue.
        opts = q.get("options") or {}
        if q.get("type") == "open" or len(opts) < 2 or not q.get("answer"):
            continue

        n = len(opts)
        perms = [list(range(n))] + gen_permutations(n, permutations, rng)

        chosen_contents = []
        chosen_letters = []
        per_perm_correct = []
        had_error = False

        for perm in perms:
            q2, new_answer, correct_content = permuted_question(q, perm)
            letter, err = infer_letter(model, q2)
            if err is not None:
                had_error = True
                chosen_letters.append(None)
                chosen_contents.append(None)
                per_perm_correct.append(None)
                continue
            chosen_letters.append(letter)
            content = q2["options"].get(letter) if letter else None
            chosen_contents.append(content)
            per_perm_correct.append(letter == new_answer if letter else False)

        # Agrégats question
        cat_agg = results["by_category"].setdefault(
            cat, {"n": 0, "orig_correct": 0, "flips": 0, "unparsed": 0})
        cat_agg["n"] += 1

        # Flip = le CONTENU choisi n'est pas identique sur toutes les permutations.
        distinct = {c for c in chosen_contents if c is not None}
        unparsed = sum(1 for c in chosen_contents if c is None)
        flip = len(distinct) > 1
        if flip:
            flips += 1
            cat_agg["flips"] += 1
        cat_agg["unparsed"] += unparsed

        # Précision sur l'ordre original (perm[0] = identité)
        orig_ok = bool(per_perm_correct[0]) if per_perm_correct else False
        if orig_ok:
            orig_correct += 1
            cat_agg["orig_correct"] += 1

        for c in per_perm_correct:
            if c is not None:
                perm_eval_sum += 1
                perm_correct_sum += 1 if c else 0

        results["evaluated"] += 1
        if had_error:
            results["errors"] += 1

        results["details"].append({
            "id": q.get("id", f"q{i}"),
            "category": cat,
            "correct_content": q["options"].get(q.get("answer")),
            "chosen_letters": chosen_letters,
            "chosen_contents": chosen_contents,
            "per_perm_correct": per_perm_correct,
            "flip": flip,
            "unparsed": unparsed,
        })

        if verbose:
            flag = "FLIP" if flip else "stable"
            print(f"  [{i+1}/{len(questions)}] {q.get('id','?')}: {flag} "
                  f"(orig {'OK' if orig_ok else 'KO'}, lettres={chosen_letters})")

    # Agrégats globaux
    ev = results["evaluated"]
    results["overall"] = {
        "orig_accuracy": round(orig_correct / ev * 100, 1) if ev else 0.0,
        "mean_perm_accuracy": round(perm_correct_sum / perm_eval_sum * 100, 1) if perm_eval_sum else 0.0,
        "flip_rate": round(flips / ev * 100, 1) if ev else 0.0,
    }
    for cat, agg in results["by_category"].items():
        n = agg["n"]
        agg["orig_accuracy"] = round(agg["orig_correct"] / n * 100, 1) if n else 0.0
        agg["flip_rate"] = round(agg["flips"] / n * 100, 1) if n else 0.0
    return results


def save_report(results: dict, prefix: str) -> Path:
    CONTAM_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    fpath = CONTAM_DIR / f"{prefix}_{results['model']}_{ts}.json"
    fpath.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    return fpath


def print_permute_summary(results: dict):
    ov = results.get("overall", {})
    print(f"\n{'='*64}")
    print(f"  Option-order probe — {results['model_label']}")
    print(f"  Questions évaluées : {results['evaluated']}/{results['total']}"
          f"   (permutations={results['permutations']}, seed={results['seed']})")
    print(f"  Précision (ordre original) : {ov.get('orig_accuracy')}%")
    print(f"  Précision (moy. permutations) : {ov.get('mean_perm_accuracy')}%")
    print(f"  Taux de FLIP global : {ov.get('flip_rate')}%")
    if results.get("errors"):
        print(f"  Questions avec erreur(s) d'appel : {results['errors']}")
    print(f"{'='*64}")
    print(f"  {'Catégorie':<26}{'n':>4}  {'Précis.orig':>11}  {'Flip':>7}")
    print(f"  {'-'*54}")
    # Trie par flip décroissant : les signaux forts en haut.
    for cat, agg in sorted(results["by_category"].items(),
                           key=lambda kv: -kv[1]["flip_rate"]):
        signal = "  <-- signal" if agg["orig_accuracy"] >= 95 and agg["flip_rate"] >= 20 else ""
        print(f"  {cat:<26}{agg['n']:>4}  {agg['orig_accuracy']:>10.1f}%  {agg['flip_rate']:>6.1f}%{signal}")
    print(f"\n  Lecture : une catégorie à haute précision ET à flip élevé suggère")
    print(f"  une mémorisation positionnelle (le modèle suit la position, pas le sens).")
    print(f"  ⚠️  Comparez au bruit de base (sous-commande `noise`) : un flip proche")
    print(f"  du bruit = NON concluant. Et un seul modèle ne prouve rien globalement :")
    print(f"  la contamination est une propriété PAIRE (dataset × modèle). Ce run est")
    print(f"  un signal EXPLORATOIRE, pas un verdict.")


# ── Analyse 2 : bruit de base de l'API (contrôle) ────────────────────────
def run_noise(model: dict, questions: list[dict], repeats: int,
              delay: float, verbose: bool) -> dict:
    """Appelle N fois le MÊME prompt (ordre d'options inchangé) et mesure le
    taux de désaccord. temperature=0.0 ne garantit pas le déterminisme via API
    (batching serveur, non-déterminisme GPU) : c'est le bruit de base sous
    lequel un flip du permute test n'est PAS interprétable comme mémorisation."""
    results = {
        "analysis": "api_baseline_noise",
        "model": model["name"],
        "model_label": model.get("label", model["name"]),
        "timestamp": datetime.now().isoformat(),
        "repeats": repeats,
        "total": len(questions),
        "evaluated": 0,
        "errors": 0,
        "by_category": {},
        "details": [],
    }
    disagreements = 0

    for i, q in enumerate(questions):
        if delay and i > 0:
            time.sleep(delay)
        # build_prompt(q) est déterministe -> le prompt est identique à chaque répétition.
        answers = []
        had_error = False
        for _ in range(repeats):
            letter, err = infer_letter(model, q)
            if err is not None:
                had_error = True
                answers.append(None)
            else:
                answers.append(letter)

        cat = q.get("category", "unknown")
        cat_agg = results["by_category"].setdefault(cat, {"n": 0, "disagree": 0})
        cat_agg["n"] += 1

        distinct = {a for a in answers if a is not None}
        disagree = len(distinct) > 1
        if disagree:
            disagreements += 1
            cat_agg["disagree"] += 1

        results["evaluated"] += 1
        if had_error:
            results["errors"] += 1
        results["details"].append({
            "id": q.get("id", f"q{i}"),
            "category": cat,
            "answers": answers,
            "disagree": disagree,
        })
        if verbose:
            flag = "DÉSACCORD" if disagree else "stable"
            print(f"  [{i+1}/{len(questions)}] {q.get('id','?')}: {flag} {answers}")

    ev = results["evaluated"]
    results["overall"] = {
        "baseline_flip_rate": round(disagreements / ev * 100, 1) if ev else 0.0,
    }
    for cat, agg in results["by_category"].items():
        agg["baseline_flip_rate"] = round(agg["disagree"] / agg["n"] * 100, 1) if agg["n"] else 0.0
    return results


def print_noise_summary(results: dict):
    ov = results.get("overall", {})
    print(f"\n{'='*64}")
    print(f"  Bruit de base API (contrôle) — {results['model_label']}")
    print(f"  Questions : {results['evaluated']}/{results['total']}   "
          f"répétitions/question : {results['repeats']}")
    print(f"  TAUX DE BRUIT DE BASE (baseline flip) : {ov.get('baseline_flip_rate')}%")
    if results.get("errors"):
        print(f"  Questions avec erreur(s) d'appel : {results['errors']}")
    print(f"{'='*64}")
    print(f"  {'Catégorie':<26}{'n':>4}  {'Bruit':>8}")
    print(f"  {'-'*42}")
    for cat, agg in sorted(results["by_category"].items(),
                           key=lambda kv: -kv[1]["baseline_flip_rate"]):
        print(f"  {cat:<26}{agg['n']:>4}  {agg['baseline_flip_rate']:>6.1f}%")
    print(f"\n  Lecture : ce taux est le SEUIL de bruit. À l'étape permute, un")
    print(f"  flip_rate proche de ce seuil = NON concluant (pas 'propre'). Seul")
    print(f"  un flip nettement AU-DESSUS de ce bruit signale une mémorisation.")


# ── CLI ──────────────────────────────────────────────────────────────────
def _resolve_questions(args):
    """Charge + filtre les questions selon --category / --per-category / --limit."""
    questions = ab.load_questions(args.questions)
    return select_questions(
        questions,
        categories=args.category or None,
        per_category=getattr(args, "per_category", 0),
        limit=args.limit,
    )


def cmd_noise(args):
    models = ab.load_models()
    if args.model:
        models = [m for m in models if m["name"] == args.model]
        if not models:
            print(f"Modèle '{args.model}' introuvable. Voir afribench.py list-models.")
            sys.exit(1)

    questions = _resolve_questions(args)
    if not questions:
        print("Aucune question sélectionnée (vérifie --category / --limit).")
        sys.exit(1)

    n_calls = len(questions) * args.repeats
    print(f"\n🎚️  Bruit de base API (contrôle — étape 2)")
    print(f"    Questions : {len(questions)}  x  {args.repeats} répétitions "
          f"= ~{n_calls} appels API / modèle")
    print(f"    Catégories : {', '.join(args.category) if args.category else 'toutes'}")
    print()

    import os
    for i, model in enumerate(models, 1):
        print(f"[{i}/{len(models)}] {model.get('label', model['name'])}...")
        if not os.environ.get(model["api_key_env"]):
            print(f"  ATTENTION : {model['api_key_env']} non définie.")
        results = run_noise(model, questions, args.repeats, args.delay, args.verbose)
        if results["evaluated"] == 0:
            print("  Aucune question évaluée (erreurs d'appel).")
            continue
        fpath = save_report(results, "noise")
        print_noise_summary(results)
        print(f"  Rapport : {fpath}")
        print()


def cmd_permute(args):
    models = ab.load_models()
    if args.model:
        models = [m for m in models if m["name"] == args.model]
        if not models:
            print(f"Modèle '{args.model}' introuvable. Voir afribench.py list-models.")
            sys.exit(1)

    questions = _resolve_questions(args)
    if not questions:
        print("Aucune question sélectionnée (vérifie --category / --limit).")
        sys.exit(1)

    n_calls = len(questions) * (1 + args.permutations)
    print(f"\n🧪  Option-order probe (contamination 1.1)")
    print(f"    Questions : {len(questions)}  x  {1 + args.permutations} ordres "
          f"= ~{n_calls} appels API / modèle")
    print(f"    Catégories : {', '.join(args.category) if args.category else 'toutes'}")
    print(f"    Modèles   : {len(models)}   seed={args.seed}")
    print()

    for i, model in enumerate(models, 1):
        print(f"[{i}/{len(models)}] {model.get('label', model['name'])}...")
        import os
        if not os.environ.get(model["api_key_env"]):
            print(f"  ATTENTION : {model['api_key_env']} non définie.")
        results = run_permute(model, questions, args.permutations,
                              args.seed, args.delay, args.verbose)
        if results["evaluated"] == 0:
            print("  Aucune question évaluée (erreurs d'appel ou questions inéligibles).")
            continue
        fpath = save_report(results, "permute")
        print_permute_summary(results)
        print(f"  Rapport : {fpath}")
        print()


def main():
    parser = argparse.ArgumentParser(
        description="Détection de contamination AfriBench (probes d'audit)")
    sub = parser.add_subparsers(dest="command", required=True)

    p_perm = sub.add_parser("permute", help="Option-order probe (1.1)")
    p_perm.add_argument("--model", "-m", help="Nom du modèle (défaut : tous)")
    p_perm.add_argument("--questions", "-q", default=ab.DEFAULT_QUESTIONS_VERSION,
                        help="Version des questions (défaut : v1)")
    p_perm.add_argument("--category", "-c", action="append",
                        help="Restreindre à une catégorie (répétable)")
    p_perm.add_argument("--per-category", type=int, default=0,
                        help="Échantillonner N questions par catégorie (reproductible)")
    p_perm.add_argument("--permutations", "-p", type=int, default=3,
                        help="Nb de permutations aléatoires en plus de l'original")
    p_perm.add_argument("--limit", type=int, default=0, help="Limiter le nb de questions")
    p_perm.add_argument("--seed", type=int, default=42, help="Graine (reproductibilité)")
    p_perm.add_argument("--delay", type=float, default=0.0,
                        help="Pause (s) entre questions (quotas free tier)")
    p_perm.add_argument("--verbose", "-v", action="store_true")
    p_perm.set_defaults(func=cmd_permute)

    # noise : bruit de base de l'API (contrôle, étape 2)
    p_noise = sub.add_parser("noise", help="Bruit de base API — contrôle (étape 2)")
    p_noise.add_argument("--model", "-m", help="Nom du modèle (défaut : tous)")
    p_noise.add_argument("--questions", "-q", default=ab.DEFAULT_QUESTIONS_VERSION,
                         help="Version des questions (défaut : v1)")
    p_noise.add_argument("--category", "-c", action="append",
                         help="Restreindre à une catégorie (répétable)")
    p_noise.add_argument("--per-category", type=int, default=0,
                         help="Échantillonner N questions par catégorie (reproductible)")
    p_noise.add_argument("--repeats", "-r", type=int, default=2,
                         help="Nb de répétitions du MÊME prompt (défaut : 2)")
    p_noise.add_argument("--limit", type=int, default=0, help="Limiter le nb de questions")
    p_noise.add_argument("--delay", type=float, default=0.0,
                         help="Pause (s) entre questions (quotas free tier)")
    p_noise.add_argument("--verbose", "-v", action="store_true")
    p_noise.set_defaults(func=cmd_noise)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
