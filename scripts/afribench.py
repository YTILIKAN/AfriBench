#!/usr/bin/env python3
"""
AfriBench — Benchmark d'évaluation des LLMs sur les réalités africaines.

Usage:
  python afribench.py run                    # Évalue tous les modèles configurés
  python afribench.py run --model gpt-4o     # Évalue un modèle spécifique
  python afribench.py run --questions v1     # Utilise un jeu de questions spécifique
  python afribench.py leaderboard            # Affiche le leaderboard des derniers résultats
  python afribench.py list-models            # Liste les modèles configurés
  python afribench.py validate questions/    # Valide la syntaxe des fichiers questions
  python afribench.py export --format csv    # Exporte les résultats

Nécessite Python ≥3.10.
Installer les dépendances : pip install pyyaml requests
"""

import argparse
import json
import os
import platform
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

try:
    import yaml
except ImportError:
    print("Erreur : pip install pyyaml requests", file=sys.stderr)
    sys.exit(1)

# ── Chemins ──────────────────────────────────────────────────────────────
REPO_ROOT = Path(__file__).resolve().parent.parent
CONFIGS_DIR = REPO_ROOT / "configs"
DATA_DIR = REPO_ROOT / "data"
QUESTIONS_DIR = DATA_DIR / "questions"
RESULTS_DIR = DATA_DIR / "results"
DEFAULT_QUESTIONS_VERSION = "v1"


# ── Chargement configs ───────────────────────────────────────────────────
def load_yaml(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_models() -> list[dict]:
    return load_yaml(CONFIGS_DIR / "models.yaml")["models"]


def load_categories() -> dict:
    return load_yaml(CONFIGS_DIR / "categories.yaml")["categories"]


# ── Chargement questions ─────────────────────────────────────────────────
def load_questions(version: str = DEFAULT_QUESTIONS_VERSION) -> list[dict]:
    """Charge les questions validées d'une version."""
    validated_dir = QUESTIONS_DIR / version / "validated"
    if not validated_dir.exists():
        # Fallback : toutes les questions .json dans le dossier de version
        validated_dir = QUESTIONS_DIR / version

    questions = []
    if validated_dir.exists():
        for fpath in sorted(validated_dir.glob("*.json")):
            if fpath.name == "template.json":
                continue
            with open(fpath, encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    questions.extend(data)
                else:
                    questions.append(data)

    if not questions:
        print(f"Aucune question trouvée dans {validated_dir}")
        print(f"Placez des fichiers JSON dans {QUESTIONS_DIR / version / 'validated/'}")
        sys.exit(1)

    return questions


# ── Prompting ────────────────────────────────────────────────────────────
def build_prompt(question: dict, few_shot: list[dict] | None = None) -> str:
    """Construit le prompt pour une question à choix multiples.

    Format standard AfriBench : question + options A/B/C/D.
    Le modèle doit répondre par la lettre de la bonne réponse.
    """
    parts = []

    # Instructions système
    parts.append(
        "Vous êtes un assistant spécialisé dans l'évaluation des connaissances "
        "sur l'Afrique. Répondez UNIQUEMENT par la lettre de la bonne réponse "
        "(A, B, C ou D), sans justification, sans ponctuation, sans note."
    )

    # Few-shot examples si fournis
    if few_shot:
        parts.append("\nVoici des exemples :")
        for ex in few_shot:
            opts = "\n".join(f"{k}. {v}" for k, v in ex["options"].items())
            parts.append(f"Question : {ex['question']}\n{opts}\nRéponse : {ex['answer']}")
        parts.append("")

    # Question courante
    options_str = "\n".join(f"{k}. {v}" for k, v in question["options"].items())
    parts.append(f"Question : {question['question']}\n{options_str}\nRéponse :")

    return "\n\n".join(parts)


def extract_answer(response_text: str) -> str | None:
    """Extrait la lettre (A, B, C, D) de la réponse du modèle."""
    text = response_text.strip().upper()

    # Cas 1 : réponse directe "A", "B", "C", "D"
    if text in ("A", "B", "C", "D"):
        return text

    # Cas 2 : "A." ou "A)" ou "A:" etc.
    if text and text[0] in ("A", "B", "C", "D"):
        return text[0]

    # Cas 3 : dans du texte comme "La réponse est A"
    for letter in ("A", "B", "C", "D"):
        if f"RÉPONSE EST {letter}" in text or f"REPONSE EST {letter}" in text:
            return letter

    # Cas 4 : seul caractère A/B/C/D dans le texte
    for char in text.replace(" ", ""):
        if char in ("A", "B", "C", "D"):
            return char

    return None


# ── Providers API ─────────────────────────────────────────────────────────
def call_openai(model: dict, prompt: str) -> str:
    """Appelle une API compatible OpenAI (OpenAI, Mistral, Together, DeepSeek)."""
    import requests

    api_key = os.environ.get(model["api_key_env"])
    if not api_key:
        raise ValueError(f"Variable {model['api_key_env']} non définie")

    base = model.get("api_base", "https://api.openai.com/v1")
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model["model_id"],
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": model.get("max_tokens", 256),
        "temperature": model.get("temperature", 0.0),
    }

    resp = requests.post(
        f"{base}/chat/completions",
        headers=headers,
        json=payload,
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def call_anthropic(model: dict, prompt: str) -> str:
    """Appelle l'API Anthropic Claude."""
    import requests

    api_key = os.environ.get(model["api_key_env"])
    if not api_key:
        raise ValueError(f"Variable {model['api_key_env']} non définie")

    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model["model_id"],
        "max_tokens": model.get("max_tokens", 256),
        "temperature": model.get("temperature", 0.0),
        "messages": [{"role": "user", "content": prompt}],
    }

    resp = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers=headers,
        json=payload,
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["content"][0]["text"]


def call_google(model: dict, prompt: str) -> str:
    """Appelle l'API Google Gemini."""
    import requests

    api_key = os.environ.get(model["api_key_env"])
    if not api_key:
        raise ValueError(f"Variable {model['api_key_env']} non définie")

    model_id = model["model_id"]
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent?key={api_key}"

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "maxOutputTokens": model.get("max_tokens", 256),
            "temperature": model.get("temperature", 0.0),
        },
    }

    resp = requests.post(url, json=payload, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]


PROVIDERS = {
    "openai": call_openai,
    "anthropic": call_anthropic,
    "google": call_google,
}


# ── Évaluation ───────────────────────────────────────────────────────────
def evaluate_model(
    model: dict,
    questions: list[dict],
    few_shot: list[dict] | None = None,
    verbose: bool = False,
) -> dict:
    """Évalue un modèle sur toutes les questions. Retourne les résultats."""
    provider_fn = PROVIDERS.get(model["provider"])
    if not provider_fn:
        raise ValueError(f"Provider inconnu : {model['provider']}")

    results = {
        "model": model["name"],
        "model_label": model.get("label", model["name"]),
        "timestamp": datetime.now().isoformat(),
        "total": len(questions),
        "correct": 0,
        "incorrect": 0,
        "no_answer": 0,
        "by_category": {},
        "by_difficulty": {"easy": {"correct": 0, "total": 0}, "medium": {"correct": 0, "total": 0}, "hard": {"correct": 0, "total": 0}},
        "details": [],
    }

    for i, q in enumerate(questions):
        cat = q.get("category", "unknown")
        diff = q.get("difficulty", "medium")

        # Initialize category counters
        if cat not in results["by_category"]:
            results["by_category"][cat] = {"correct": 0, "total": 0}
        if diff not in results["by_difficulty"]:
            results["by_difficulty"][diff] = {"correct": 0, "total": 0}

        prompt = build_prompt(q, few_shot)
        correct_answer = q.get("answer", "").strip().upper()

        # Rate limiting : délai entre chaque question
        if i > 0:
            time.sleep(0.5)

        # API call with retry (up to 5 attempts for rate limits)
        model_answer = None
        error = None
        for attempt in range(5):
            try:
                response = provider_fn(model, prompt)
                model_answer = extract_answer(response)
                error = None
                break
            except Exception as e:
                error = str(e)
                if attempt < 4:
                    delay = 2 ** attempt + 1  # 2s, 3s, 5s, 9s
                    if hasattr(e, 'response') and e.response is not None and e.response.status_code == 429:
                        delay = 5 + 10 * attempt  # 5s, 15s, 25s, 35s for rate limits
                    time.sleep(delay)

        is_correct = model_answer == correct_answer if model_answer else False

        # Update counters
        results["by_category"][cat]["total"] += 1
        results["by_difficulty"][diff]["total"] += 1

        if is_correct:
            results["correct"] += 1
            results["by_category"][cat]["correct"] += 1
            results["by_difficulty"][diff]["correct"] += 1
        elif model_answer is None:
            results["no_answer"] += 1
        else:
            results["incorrect"] += 1

        detail = {
            "id": q.get("id", f"q{i}"),
            "category": cat,
            "difficulty": diff,
            "expected": correct_answer,
            "got": model_answer,
            "correct": is_correct,
        }
        if error:
            detail["error"] = error
        results["details"].append(detail)

        if verbose:
            status = "✓" if is_correct else "✗" if model_answer else "?"
            print(f"  [{i+1}/{len(questions)}] {q.get('id', '?')}: {status} (attendu={correct_answer}, reçu={model_answer})")

    # Calculate percentages
    results["accuracy"] = round(results["correct"] / results["total"] * 100, 1) if results["total"] else 0.0
    for cat, counts in results["by_category"].items():
        counts["accuracy"] = round(counts["correct"] / counts["total"] * 100, 1) if counts["total"] else 0.0
    for diff, counts in results["by_difficulty"].items():
        counts["accuracy"] = round(counts["correct"] / counts["total"] * 100, 1) if counts["total"] else 0.0

    return results


# ── Résultats ────────────────────────────────────────────────────────────
def save_results(results: dict):
    """Sauvegarde les résultats dans data/results/."""
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    model_name = results["model"]
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    fpath = RESULTS_DIR / f"{model_name}_{ts}.json"
    with open(fpath, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"  Résultats sauvegardés : {fpath}")
    return fpath


def load_all_results() -> list[dict]:
    """Charge tous les résultats depuis data/results/."""
    all_results = []
    if RESULTS_DIR.exists():
        for fpath in sorted(RESULTS_DIR.glob("*.json"), reverse=True):
            with open(fpath, encoding="utf-8") as f:
                all_results.append(json.load(f))
    return all_results


def print_summary(results: dict):
    """Affiche un résumé compact des résultats."""
    m = results["model_label"]
    acc = results["accuracy"]
    total = results["total"]
    correct = results["correct"]
    no_ans = results["no_answer"]
    print(f"\n{'='*50}")
    print(f"  {m}")
    print(f"  Score : {acc}% ({correct}/{total})")
    if no_ans:
        print(f"  Sans réponse : {no_ans}")
    print(f"{'='*50}")
    print(f"\n  Par catégorie :")
    for cat, counts in sorted(results["by_category"].items()):
        c = counts
        print(f"    {cat:<25} {c['accuracy']:>5.1f}%  ({c['correct']}/{c['total']})")
    print(f"\n  Par difficulté :")
    for diff in ("easy", "medium", "hard"):
        if diff in results["by_difficulty"]:
            c = results["by_difficulty"][diff]
            label = {"easy": "Facile", "medium": "Moyen", "hard": "Difficile"}[diff]
            print(f"    {label:<10} {c['accuracy']:>5.1f}%  ({c['correct']}/{c['total']})")


def print_leaderboard(results_list: list[dict], top_n: int = 10):
    """Affiche le leaderboard à partir des résultats sauvegardés."""
    if not results_list:
        print("Aucun résultat trouvé. Lancez d'abord `python afribench.py run`.")
        return

    # Dédoublonne : garde le plus récent par modèle
    latest = {}
    for r in results_list:
        name = r["model"]
        if name not in latest or r["timestamp"] > latest[name]["timestamp"]:
            latest[name] = r

    sorted_models = sorted(latest.values(), key=lambda x: x["accuracy"], reverse=True)

    print(f"\n🏆  Leaderboard AfriBench")
    print(f"    Dernière mise à jour : {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"{'='*55}")
    print(f"  {'#':<3} {'Modèle':<25} {'Score':<8} {'Questions':<10}")
    print(f"{'-'*55}")
    for i, r in enumerate(sorted_models[:top_n], 1):
        print(f"  {i:<3} {r['model_label']:<25} {r['accuracy']:>5.1f}%  ({r['correct']}/{r['total']})")
    print(f"{'='*55}")


# ── Validation ───────────────────────────────────────────────────────────
def validate_questions(path: str) -> bool:
    """Valide la syntaxe et la structure des fichiers questions."""
    qdir = Path(path)
    if not qdir.exists():
        print(f"Erreur : {path} n'existe pas")
        return False

    valid = True
    categories = load_categories()
    difficulty_levels = {"easy", "medium", "hard"}

    for fpath in sorted(qdir.glob("*.json")):
        if fpath.name == "template.json":
            continue
        try:
            with open(fpath, encoding="utf-8") as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            print(f"  ✗ {fpath.name} : JSON invalide — {e}")
            valid = False
            continue

        items = data if isinstance(data, list) else [data]
        for item in items:
            errors = []

            # Champs obligatoires
            for field in ("id", "question", "options", "answer", "category"):
                if field not in item:
                    errors.append(f"champ manquant '{field}'")

            # Options
            if "options" in item:
                opts = item["options"]
                if not isinstance(opts, dict):
                    errors.append("'options' doit être un dictionnaire {A: ..., B: ..., ...}")
                elif len(opts) < 2:
                    errors.append("'options' doit avoir au moins 2 choix")
                elif "answer" in item and item["answer"] not in opts:
                    errors.append(f"réponse '{item['answer']}' absente des options")

            # Catégorie
            if "category" in item and item["category"] not in categories:
                valid_cats = ", ".join(categories.keys())
                errors.append(f"catégorie '{item['category']}' inconnue. Valides : {valid_cats}")

            # Difficulté
            if "difficulty" in item and item["difficulty"] not in difficulty_levels:
                errors.append(f"difficulté '{item['difficulty']}' invalide. Utilisez easy/medium/hard")

            if errors:
                item_id = item.get("id", fpath.name)
                print(f"  ✗ {item_id} : {'; '.join(errors)}")
                valid = False
            else:
                item_id = item.get("id", fpath.name)
                print(f"  ✓ {item_id}")

    return valid


# ── Export ───────────────────────────────────────────────────────────────
def export_results(results_list: list[dict], fmt: str = "json"):
    """Exporte les résultats dans un format donné."""
    latest = {}
    for r in results_list:
        name = r["model"]
        if name not in latest or r["timestamp"] > latest[name]["timestamp"]:
            latest[name] = r

    sorted_models = sorted(latest.values(), key=lambda x: x["accuracy"], reverse=True)

    if fmt == "json":
        out = []
        for r in sorted_models:
            out.append({
                "model": r["model_label"],
                "accuracy": r["accuracy"],
                "correct": r["correct"],
                "total": r["total"],
                "by_category": {k: {"accuracy": v["accuracy"], "correct": v["correct"], "total": v["total"]}
                                for k, v in r["by_category"].items()},
                "by_difficulty": r["by_difficulty"],
                "timestamp": r["timestamp"],
            })
        print(json.dumps(out, indent=2, ensure_ascii=False))

    elif fmt == "csv":
        print("model,accuracy,correct,total,cat_histoire,cat_geographie,cat_economie,cat_langue_culture,cat_sante_sciences,cat_droit_politique,cat_ia_technologie,cat_societe,cat_raisonnement_culturel,easy_acc,medium_acc,hard_acc")
        for r in sorted_models:
            cats = r.get("by_category", {})
            diffs = r.get("by_difficulty", {})
            print(
                f"{r['model_label']},{r['accuracy']},{r['correct']},{r['total']},"
                f"{cats.get('histoire', {}).get('accuracy', 0)},"
                f"{cats.get('geographie', {}).get('accuracy', 0)},"
                f"{cats.get('economie', {}).get('accuracy', 0)},"
                f"{cats.get('langue_culture', {}).get('accuracy', 0)},"
                f"{cats.get('sante_sciences', {}).get('accuracy', 0)},"
                f"{cats.get('droit_politique', {}).get('accuracy', 0)},"
                f"{cats.get('ia_technologie', {}).get('accuracy', 0)},"
                f"{cats.get('societe', {}).get('accuracy', 0)},"
                f"{cats.get('raisonnement_culturel', {}).get('accuracy', 0)},"
                f"{diffs.get('easy', {}).get('accuracy', 0)},"
                f"{diffs.get('medium', {}).get('accuracy', 0)},"
                f"{diffs.get('hard', {}).get('accuracy', 0)}"
            )
    elif fmt == "markdown":
        print("| # | Modèle | Score | Questions |")
        print("|---|---|---|---|")
        for i, r in enumerate(sorted_models, 1):
            print(f"| {i} | {r['model_label']} | {r['accuracy']:.1f}% | {r['correct']}/{r['total']} |")

    else:
        print(f"Format inconnu : {fmt}. Utilisez json, csv ou markdown.")


# ── CLI ──────────────────────────────────────────────────────────────────
def cmd_run(args):
    """Lance l'évaluation."""
    models = load_models()
    categories = load_categories()
    questions = load_questions(args.questions)

    # Filtrer par modèle si spécifié
    if args.model:
        models = [m for m in models if m["name"] == args.model]
        if not models:
            print(f"Modèle '{args.model}' introuvable. Utilisez --list-models.")
            sys.exit(1)

    # Few-shot si demandé
    few_shot = None
    if args.few_shot > 0:
        few_shot = questions[:args.few_shot]

    total_models = len(models)
    print(f"\n📊  AfriBench — Évaluation")
    print(f"    Questions : {len(questions)}")
    print(f"    Modèles   : {total_models}")
    print(f"    Few-shot  : {args.few_shot if few_shot else 'non'}")
    print()

    for i, model in enumerate(models, 1):
        print(f"[{i}/{total_models}] Évaluation de {model.get('label', model['name'])}...")
        try:
            results = evaluate_model(model, questions, few_shot, verbose=args.verbose)
            save_results(results)
            print_summary(results)
        except Exception as e:
            print(f"  ERREUR : {e}")
        print()


def cmd_leaderboard(args):
    """Affiche le leaderboard."""
    results = load_all_results()
    print_leaderboard(results, args.top_n)


def cmd_list_models(args):
    """Liste les modèles configurés."""
    models = load_models()
    print(f"\nModèles configurés ({len(models)}) :")
    print(f"{'='*50}")
    for m in models:
        api_key = os.environ.get(m["api_key_env"], "⚠️  NON DÉFINIE")
        if api_key and api_key != "⚠️  NON DÉFINIE":
            api_key = f"✓ ({m['api_key_env']})"
        print(f"  {m['name']:<20} {m.get('label', ''):<25} {api_key}")
    print()


def cmd_validate(args):
    """Valide les fichiers questions."""
    path = args.path or str(QUESTIONS_DIR / DEFAULT_QUESTIONS_VERSION)
    print(f"\nValidation des questions dans {path}...\n")
    ok = validate_questions(path)
    print(f"\n{'✓ Toutes valides' if ok else '✗ Certaines questions ont des erreurs'}")


def cmd_export(args):
    """Exporte les résultats."""
    results = load_all_results()
    export_results(results, args.format)


def main():
    parser = argparse.ArgumentParser(
        description="AfriBench — Évaluer les LLMs sur les réalités africaines"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # run
    p_run = sub.add_parser("run", help="Lance l'évaluation des modèles")
    p_run.add_argument("--model", "-m", help="Nom du modèle (optionnel, tous par défaut)")
    p_run.add_argument("--questions", "-q", default=DEFAULT_QUESTIONS_VERSION, help="Version des questions")
    p_run.add_argument("--few-shot", "-f", type=int, default=0, help="Nombre d'exemples few-shot")
    p_run.add_argument("--verbose", "-v", action="store_true", help="Affiche chaque question")
    p_run.set_defaults(func=cmd_run)

    # leaderboard
    p_lb = sub.add_parser("leaderboard", help="Affiche le leaderboard")
    p_lb.add_argument("--top-n", "-n", type=int, default=10, help="Nombre de modèles à afficher")
    p_lb.set_defaults(func=cmd_leaderboard)

    # list-models
    p_lm = sub.add_parser("list-models", help="Liste les modèles configurés")
    p_lm.set_defaults(func=cmd_list_models)

    # validate
    p_val = sub.add_parser("validate", help="Valide les fichiers questions")
    p_val.add_argument("path", nargs="?", help="Chemin vers le dossier de questions")
    p_val.set_defaults(func=cmd_validate)

    # export
    p_exp = sub.add_parser("export", help="Exporte les résultats")
    p_exp.add_argument("--format", "-f", choices=["json", "csv", "markdown"], default="json")
    p_exp.set_defaults(func=cmd_export)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
