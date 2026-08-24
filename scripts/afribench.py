#!/usr/bin/env python3
"""
AfriBench — Benchmark d'évaluation des LLMs sur les réalités africaines.

Usage:
  python afribench.py run                    # Évalue tous les modèles configurés
  python afribench.py run --model gpt-4o     # Évalue un modèle spécifique
  python afribench.py run --questions v1     # Utilise un jeu de questions spécifique
  python afribench.py run --mock             # Évaluation déterministe sans clés API
  python afribench.py leaderboard            # Affiche le leaderboard des derniers résultats
  python afribench.py list-models            # Liste les modèles configurés
  python afribench.py validate questions/    # Valide la syntaxe des fichiers questions
  python afribench.py export --format csv    # Exporte les résultats

Nécessite Python ≥3.10.
Installer les dépendances : pip install -r requirements.txt
"""

import argparse
import hashlib
import json
import os
import random
import re
import sys
import time
from datetime import datetime
from pathlib import Path


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
def resolve_questions_dir(version: str = DEFAULT_QUESTIONS_VERSION) -> Path:
    """Résout le dossier de questions.

    - `v1` → data/questions/v1/validated (benchmark Afrique)
    - `witness` → data/questions/v1/witness (témoins / baseline)
    """
    if version in {"witness", "control", "temoin"}:
        return QUESTIONS_DIR / DEFAULT_QUESTIONS_VERSION / "witness"
    validated_dir = QUESTIONS_DIR / version / "validated"
    if validated_dir.exists():
        return validated_dir
    return QUESTIONS_DIR / version


def load_questions(version: str = DEFAULT_QUESTIONS_VERSION) -> list[dict]:
    """Charge les questions d'une version / jeu."""
    questions_dir = resolve_questions_dir(version)

    questions = []
    if questions_dir.exists():
        for fpath in sorted(questions_dir.glob("*.json")):
            if fpath.name == "template.json":
                continue
            with open(fpath, encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    questions.extend(data)
                else:
                    questions.append(data)

    if not questions:
        print(f"Aucune question trouvée dans {questions_dir}")
        print(f"Placez des fichiers JSON dans {questions_dir}/")
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


# Motifs d'extraction, du plus strict au plus permissif. Chacun est ancré :
# une prose libre ne doit jamais produire de lettre par accident.
# « D'après moi, c'est B » ou « Désolé, je ne peux pas répondre » doivent
# rester sans réponse plutôt que d'être notés D.
_ANSWER_ONLY = re.compile(r"^\W*\*{0,2}([ABCD])\*{0,2}\W*$")
_ANSWER_PREFIX = re.compile(r"^\*{0,2}([ABCD])\*{0,2}\s*[.):\-–—]\s")
_ANSWER_PHRASE = re.compile(
    r"\b(?:R[ÉE]PONSE|ANSWER|CHOIX|OPTION)\b[\s:=]*(?:EST|IS)?[\s:=]*\*{0,2}([ABCD])\b"
)
_STANDALONE_LETTER = re.compile(r"\b([ABCD])\b")


def extract_answer(response_text: str) -> str | None:
    """Extrait la lettre (A, B, C, D) de la réponse du modèle.

    Renvoie ``None`` dès que la réponse est ambiguë : un refus, un message
    d'erreur du fournisseur ou une justification en prose doivent être comptés
    comme absence de réponse, jamais comme une lettre devinée.
    """
    text = (response_text or "").strip().upper()
    if not text:
        return None

    # Cas 1 : la réponse est la lettre seule, éventuellement ponctuée ou en gras.
    match = _ANSWER_ONLY.match(text)
    if match:
        return match.group(1)

    # Cas 2 : la lettre ouvre la réponse, suivie d'un séparateur — « B. Empire du Mali ».
    match = _ANSWER_PREFIX.match(text)
    if match:
        return match.group(1)

    # Cas 3 : formulation explicite — « La réponse est C », « Answer: C ».
    match = _ANSWER_PHRASE.search(text)
    if match:
        return match.group(1)

    # Cas 4 : dernier recours, une seule lettre isolée dans tout le texte.
    # L'unicité est exigée : « D'après moi, c'est B » contient D et B, donc reste ambigu.
    letters = set(_STANDALONE_LETTER.findall(text))
    if len(letters) == 1:
        return letters.pop()

    return None


# ── Providers API ─────────────────────────────────────────────────────────
def _resolve_api_key(model: dict) -> str:
    """Clé API fournie directement (backoffice) sinon variable d'environnement."""
    key = model.get("api_key") or os.environ.get(model.get("api_key_env", ""))
    if not key:
        raise ValueError(
            f"Clé API manquante pour {model.get('name')} "
            f"(définir api_key ou {model.get('api_key_env')})"
        )
    return key


def call_openai(model: dict, prompt: str) -> str:
    """Appelle une API compatible OpenAI (OpenAI, Mistral, Together, DeepSeek)."""
    import requests

    api_key = _resolve_api_key(model)

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

    api_key = _resolve_api_key(model)

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

    api_key = _resolve_api_key(model)

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
def _mock_target_accuracy(model_name: str) -> float:
    """Cible déterministe ∈ [0.62, 0.94] dérivée du nom du modèle."""
    digest = hashlib.sha256(model_name.encode("utf-8")).hexdigest()
    bucket = int(digest[:8], 16) / 0xFFFFFFFF
    return round(0.62 + bucket * 0.32, 4)


def _mock_answer(model_name: str, question: dict, rng: random.Random) -> str:
    """Répond correctement avec une proba cible ; sinon une lettre incorrecte."""
    correct = question.get("answer", "A").strip().upper()
    letters = ["A", "B", "C", "D"]
    if correct not in letters:
        correct = "A"
    target = _mock_target_accuracy(model_name)
    # Bias léger par difficulté
    diff = question.get("difficulty", "medium")
    adj = {"easy": 0.06, "medium": 0.0, "hard": -0.08}.get(diff, 0.0)
    p = min(0.98, max(0.35, target + adj))
    if rng.random() < p:
        return correct
    wrong = [x for x in letters if x != correct]
    return rng.choice(wrong)


def evaluate_model(
    model: dict,
    questions: list[dict],
    few_shot: list[dict] | None = None,
    verbose: bool = False,
    mock: bool = False,
) -> dict:
    """Évalue un modèle sur toutes les questions. Retourne les résultats."""
    provider_fn = None
    if not mock:
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
        "mock": mock,
    }

    rng = None
    if mock:
        seed = int(hashlib.sha256(model["name"].encode("utf-8")).hexdigest()[:16], 16)
        rng = random.Random(seed)

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

        model_answer = None
        error = None
        unparsed = None

        if mock:
            model_answer = _mock_answer(model["name"], q, rng)
        else:
            # Rate limiting : délai entre chaque question
            if i > 0:
                time.sleep(0.5)

            # API call with retry (up to 5 attempts for rate limits)
            for attempt in range(5):
                try:
                    response = provider_fn(model, prompt)
                    model_answer = extract_answer(response)
                    # Une réponse non interprétable est conservée : c'est la seule
                    # façon d'auditer les no_answer et d'affiner les motifs.
                    if model_answer is None:
                        unparsed = response.strip()[:200]
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
        if unparsed:
            detail["unparsed_response"] = unparsed
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
    """Sauvegarde les résultats dans data/results/ (ou results/mock/ si mock)."""
    out_dir = RESULTS_DIR / "mock" if results.get("mock") else RESULTS_DIR
    out_dir.mkdir(parents=True, exist_ok=True)
    model_name = results["model"]
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    prefix = "mock_" if results.get("mock") else ""
    fpath = out_dir / f"{prefix}{model_name}_{ts}.json"
    with open(fpath, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"  Résultats sauvegardés : {fpath}")
    return fpath


def load_all_results(*, include_mock: bool = False) -> list[dict]:
    """Charge tous les résultats depuis data/results/ (hors mock par défaut)."""
    all_results = []
    if RESULTS_DIR.exists():
        for fpath in sorted(RESULTS_DIR.glob("*.json"), reverse=True):
            with open(fpath, encoding="utf-8") as f:
                all_results.append(json.load(f))
        if include_mock:
            mock_dir = RESULTS_DIR / "mock"
            if mock_dir.exists():
                for fpath in sorted(mock_dir.glob("*.json"), reverse=True):
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
    mock = bool(getattr(args, "mock", False))

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
    print(f"\n📊  AfriBench — Évaluation{' (MOCK)' if mock else ''}")
    print(f"    Questions : {len(questions)}")
    print(f"    Modèles   : {total_models}")
    print(f"    Few-shot  : {args.few_shot if few_shot else 'non'}")
    if mock:
        print("    Mode      : mock (déterministe, sans clés API)")
    print()

    for i, model in enumerate(models, 1):
        print(f"[{i}/{total_models}] Évaluation de {model.get('label', model['name'])}...")
        try:
            results = evaluate_model(
                model, questions, few_shot, verbose=args.verbose, mock=mock
            )
            save_results(results)
            print_summary(results)
        except Exception as e:
            print(f"  ERREUR : {e}")
        print()


def cmd_leaderboard(args):
    """Affiche le leaderboard."""
    results = load_all_results(include_mock=bool(getattr(args, "include_mock", False)))
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
    p_run.add_argument(
        "--questions",
        "-q",
        default=DEFAULT_QUESTIONS_VERSION,
        help="Jeu de questions : v1 (Afrique) ou witness (témoins baseline)",
    )
    p_run.add_argument("--few-shot", "-f", type=int, default=0, help="Nombre d'exemples few-shot")
    p_run.add_argument("--verbose", "-v", action="store_true", help="Affiche chaque question")
    p_run.add_argument(
        "--mock",
        action="store_true",
        help="Évaluation déterministe sans appels API (CI / offline)",
    )
    p_run.set_defaults(func=cmd_run)

    # leaderboard
    p_lb = sub.add_parser("leaderboard", help="Affiche le leaderboard")
    p_lb.add_argument("--top-n", "-n", type=int, default=10, help="Nombre de modèles à afficher")
    p_lb.add_argument(
        "--include-mock",
        action="store_true",
        help="Inclure les résultats mock (data/results/mock/)",
    )
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
