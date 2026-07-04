#!/usr/bin/env python3
"""
AfriBench — Benchmark d'évaluation des LLMs sur les réalités africaines.

Usage:
  python afribench.py run                    # Évalue tous les modèles (QCM)
  python afribench.py run --model gpt-4o     # Évalue un modèle spécifique
  python afribench.py run --questions v1     # Utilise un jeu de questions spécifique
  python afribench.py run-open --dry-run     # Éval OUVERTE (LLM-as-judge), essai 3 questions
  python afribench.py run-open --model gpt-4o  # Éval ouverte d'un modèle
  python afribench.py leaderboard            # Leaderboard (colonnes QCM + Ouvert)
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

# Sous Windows, la console est en cp1252 par défaut et plante sur les emojis /
# coches (✓, 🏆…). On force UTF-8 pour que l'affichage ne casse jamais.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:  # noqa: BLE001
        pass

# ── Chemins ──────────────────────────────────────────────────────────────
# Le dossier scripts/ doit être importable (judge_open) quel que soit le cwd.
sys.path.insert(0, str(Path(__file__).resolve().parent))
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
                items = data if isinstance(data, list) else [data]
                # Les questions ouvertes (type=open) sont évaluées séparément
                # (LLM-as-judge) et ne doivent pas passer dans l'éval QCM.
                questions.extend(it for it in items if it.get("type") != "open")

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
def call_openai(model: dict, prompt: str, system: str | None = None) -> str:
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
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    payload = {
        "model": model["model_id"],
        "messages": messages,
        "max_tokens": model.get("max_tokens", 256),
    }
    # Température omise si None (certains modèles juges, ex. Opus 4.8, la refusent)
    temperature = model.get("temperature", 0.0)
    if temperature is not None:
        payload["temperature"] = temperature

    resp = requests.post(
        f"{base}/chat/completions",
        headers=headers,
        json=payload,
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def call_anthropic(model: dict, prompt: str, system: str | None = None) -> str:
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
        "messages": [{"role": "user", "content": prompt}],
    }
    if system:
        payload["system"] = system
    # Température omise si None : Opus 4.8/4.7 refusent le paramètre (HTTP 400).
    temperature = model.get("temperature", 0.0)
    if temperature is not None:
        payload["temperature"] = temperature

    resp = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers=headers,
        json=payload,
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["content"][0]["text"]


def call_google(model: dict, prompt: str, system: str | None = None) -> str:
    """Appelle l'API Google Gemini."""
    import requests

    api_key = os.environ.get(model["api_key_env"])
    if not api_key:
        raise ValueError(f"Variable {model['api_key_env']} non définie")

    model_id = model["model_id"]
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent?key={api_key}"

    generation_config = {"maxOutputTokens": model.get("max_tokens", 256)}
    temperature = model.get("temperature", 0.0)
    if temperature is not None:
        generation_config["temperature"] = temperature
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": generation_config,
    }
    if system:
        payload["systemInstruction"] = {"parts": [{"text": system}]}

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
        "eval_type": "mcq",
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

        # API call with retry
        model_answer = None
        error = None
        for attempt in range(3):
            try:
                response = provider_fn(model, prompt)
                model_answer = extract_answer(response)
                error = None
                break
            except Exception as e:
                error = str(e)
                if attempt < 2:
                    time.sleep(2 ** attempt)

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


# ── Évaluation OUVERTE (LLM-as-judge) ────────────────────────────────────
# Les questions type=open (ex. SAQ médicales d'AfriMed-QA) n'ont ni `options`
# ni `answer` mais une `reference_answer`, un `rubric_id` et scoring_method=
# llm_judge. Elles sont notées par un modèle JUGE FIXE et documenté, distinct
# des modèles évalués, via scripts/judge_open.py (grille afribench-judge-1.0).
OPEN_QUESTIONS_DIR = QUESTIONS_DIR / "afrimed"

# Modèle juge par défaut si aucun bloc `judge:` n'est présent dans models.yaml.
# Opus 4.8 n'accepte pas le paramètre `temperature` (HTTP 400) : on l'omet
# (temperature=None) ; le déterminisme repose sur la grille de notation fixe.
DEFAULT_JUDGE = {
    "name": "afribench-judge",
    "label": "AfriBench Judge (Claude Opus 4.8)",
    "provider": "anthropic",
    "model_id": "claude-opus-4-8",
    "api_key_env": "ANTHROPIC_API_KEY",
    "max_tokens": 1024,
    "temperature": None,
}


def load_judge_config() -> dict:
    """Charge la config du modèle juge depuis models.yaml (bloc `judge:`)."""
    cfg = load_yaml(CONFIGS_DIR / "models.yaml")
    return cfg.get("judge") or DEFAULT_JUDGE


def load_open_questions(path: str | None = None) -> list[dict]:
    """Charge les questions ouvertes (type=open) depuis un dossier."""
    qdir = Path(path) if path else OPEN_QUESTIONS_DIR
    questions = []
    if qdir.exists():
        for fpath in sorted(qdir.glob("*.json")):
            with open(fpath, encoding="utf-8") as f:
                data = json.load(f)
            items = data if isinstance(data, list) else [data]
            questions.extend(it for it in items if it.get("type") == "open")

    if not questions:
        print(f"Aucune question ouverte (type=open) trouvée dans {qdir}")
        print("Générez-les d'abord, ex. : python scripts/afrimedqa_saq_to_afribench.py --limit 200")
        sys.exit(1)
    return questions


def build_open_prompt(question: dict) -> str:
    """Construit le prompt de génération pour une question ouverte."""
    return (
        "Vous êtes un expert des réalités africaines. Répondez à la question "
        "suivante de façon factuelle, précise et concise, dans la MÊME langue "
        "que la question. N'ajoutez pas de préambule ni de formule de "
        "politesse.\n\n"
        f"Question : {question['question']}\nRéponse :"
    )


def make_judge_call_fn(judge_model: dict):
    """Retourne une fonction judge_call_fn(system, user) -> str.

    Réutilise la même couche multi-provider que l'éval QCM, avec retry.
    """
    provider_fn = PROVIDERS.get(judge_model["provider"])
    if not provider_fn:
        raise ValueError(f"Provider juge inconnu : {judge_model['provider']}")

    def judge_call_fn(system: str, user: str) -> str:
        last_err = None
        for attempt in range(3):
            try:
                return provider_fn(judge_model, user, system=system)
            except Exception as e:  # noqa: BLE001
                last_err = e
                if attempt < 2:
                    time.sleep(2 ** attempt)
        raise last_err

    return judge_call_fn


def evaluate_model_open(
    model: dict,
    questions: list[dict],
    judge_call_fn,
    judge_model: dict,
    verbose: bool = False,
) -> dict:
    """Évalue un modèle sur des questions ouvertes via LLM-as-judge.

    Pour chaque question : le modèle génère une réponse à `question`, puis le
    juge la note (0-100) selon la grille `rubric_id`. Agrège séparément des QCM.
    """
    import judge_open

    provider_fn = PROVIDERS.get(model["provider"])
    if not provider_fn:
        raise ValueError(f"Provider inconnu : {model['provider']}")

    results = {
        "eval_type": "open",
        "model": model["name"],
        "model_label": model.get("label", model["name"]),
        "timestamp": datetime.now().isoformat(),
        "judge_version": judge_open.JUDGE_VERSION,
        "judge_model": judge_model.get("model_id"),
        "judge_label": judge_model.get("label", judge_model.get("model_id")),
        "total": len(questions),
        "scored": 0,
        "errors": 0,
        "by_category": {},
        "by_criterion": {},   # moyennes 0-5 par critère de la grille
        "details": [],
    }

    # Les réponses ouvertes ont besoin de plus de tokens que les QCM (une lettre).
    gen_model = {**model, "max_tokens": max(model.get("max_tokens", 256), 512)}
    score_sum = 0.0

    for i, q in enumerate(questions):
        cat = q.get("category", "unknown")
        rubric_id = q.get("rubric_id", "general_v1")
        prompt = build_open_prompt(q)

        model_answer, error = None, None
        for attempt in range(3):
            try:
                model_answer = provider_fn(gen_model, prompt)
                error = None
                break
            except Exception as e:  # noqa: BLE001
                error = str(e)
                if attempt < 2:
                    time.sleep(2 ** attempt)

        detail = {"id": q.get("id", f"q{i}"), "category": cat, "rubric_id": rubric_id}

        if not model_answer:
            results["errors"] += 1
            detail["score"] = None
            detail["error"] = error or "réponse vide du modèle"
            results["details"].append(detail)
            if verbose:
                print(f"  [{i+1}/{len(questions)}] {detail['id']}: ERREUR génération")
            continue

        try:
            scored = judge_open.score_open_answer(
                q.get("question", ""),
                q.get("reference_answer", ""),
                q.get("key_points", []),
                rubric_id,
                model_answer,
                judge_call_fn,
            )
        except Exception as e:  # noqa: BLE001
            results["errors"] += 1
            detail["score"] = None
            detail["error"] = f"juge: {e}"
            results["details"].append(detail)
            if verbose:
                print(f"  [{i+1}/{len(questions)}] {detail['id']}: ERREUR juge ({e})")
            continue

        sc = scored["score"]
        score_sum += sc
        results["scored"] += 1

        c = results["by_category"].setdefault(cat, {"sum": 0.0, "n": 0})
        c["sum"] += sc
        c["n"] += 1
        for crit, val in scored["criteria_scores"].items():
            cc = results["by_criterion"].setdefault(crit, {"sum": 0.0, "n": 0})
            cc["sum"] += val
            cc["n"] += 1

        detail.update({
            "score": sc,
            "criteria_scores": scored["criteria_scores"],
            "model_answer": model_answer[:1000],
        })
        results["details"].append(detail)
        if verbose:
            print(f"  [{i+1}/{len(questions)}] {detail['id']}: {sc}/100")

    results["mean_score"] = round(score_sum / results["scored"], 1) if results["scored"] else 0.0
    for agg in results["by_category"].values():
        agg["mean_score"] = round(agg["sum"] / agg["n"], 1) if agg["n"] else 0.0
    for agg in results["by_criterion"].values():
        agg["mean_score"] = round(agg["sum"] / agg["n"], 2) if agg["n"] else 0.0
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


def save_open_results(results: dict):
    """Sauvegarde les résultats d'éval ouverte (fichier distinct des QCM)."""
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    model_name = results["model"]
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    fpath = RESULTS_DIR / f"{model_name}_open_{ts}.json"
    with open(fpath, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"  Résultats (ouvert) sauvegardés : {fpath}")
    return fpath


def load_all_results() -> list[dict]:
    """Charge tous les résultats depuis data/results/."""
    all_results = []
    if RESULTS_DIR.exists():
        for fpath in sorted(RESULTS_DIR.glob("*.json"), reverse=True):
            with open(fpath, encoding="utf-8") as f:
                r = json.load(f)
            # Rétrocompat : les anciens fichiers n'ont pas de champ eval_type.
            r.setdefault("eval_type", "mcq")
            all_results.append(r)
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


def _latest_by_model(results_list: list[dict], eval_type: str) -> dict:
    """Dernier résultat par modèle pour un type d'éval donné (mcq/open)."""
    latest = {}
    for r in results_list:
        if r.get("eval_type", "mcq") != eval_type:
            continue
        name = r["model"]
        if name not in latest or r["timestamp"] > latest[name]["timestamp"]:
            latest[name] = r
    return latest


def print_summary_open(results: dict):
    """Affiche un résumé compact d'une éval ouverte."""
    print(f"\n{'='*50}")
    print(f"  {results['model_label']}  (éval OUVERTE — LLM-as-judge)")
    print(f"  Score juge : {results['mean_score']}/100  ({results['scored']}/{results['total']} notées)")
    print(f"  Juge : {results.get('judge_label')} — grille {results.get('judge_version')}")
    if results.get("errors"):
        print(f"  Erreurs : {results['errors']}")
    print(f"{'='*50}")
    if results["by_category"]:
        print(f"\n  Par catégorie :")
        for cat, c in sorted(results["by_category"].items()):
            print(f"    {cat:<25} {c['mean_score']:>5.1f}/100  ({c['n']})")
    if results["by_criterion"]:
        print(f"\n  Par critère (0-5) :")
        for crit, c in results["by_criterion"].items():
            print(f"    {crit:<25} {c['mean_score']:>4.2f}/5")


def print_leaderboard(results_list: list[dict], top_n: int = 10):
    """Affiche le leaderboard : deux colonnes distinctes (QCM % vs juge 0-100)."""
    if not results_list:
        print("Aucun résultat trouvé. Lancez d'abord `python afribench.py run`.")
        return

    mcq = _latest_by_model(results_list, "mcq")
    opn = _latest_by_model(results_list, "open")

    rows = []
    for name in set(mcq) | set(opn):
        label = (mcq.get(name) or opn.get(name))["model_label"]
        acc = mcq[name]["accuracy"] if name in mcq else None
        osc = opn[name]["mean_score"] if name in opn else None
        rows.append((label, acc, osc))
    # Tri : d'abord ceux qui ont un score QCM (décroissant), puis par score juge.
    rows.sort(key=lambda x: (x[1] is None, -(x[1] or 0), -(x[2] or 0)))

    def fmt_acc(v):
        return f"{v:>5.1f}%" if v is not None else "   —  "

    def fmt_open(v):
        return f"{v:>5.1f}" if v is not None else "  —  "

    print(f"\n🏆  Leaderboard AfriBench")
    print(f"    Dernière mise à jour : {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"    Colonnes distinctes : QCM = % bonnes réponses ; Ouvert = score juge /100")
    print(f"{'='*62}")
    print(f"  {'#':<3} {'Modèle':<27} {'QCM':<8} {'Ouvert':<8}")
    print(f"{'-'*62}")
    for i, (label, acc, osc) in enumerate(rows[:top_n], 1):
        print(f"  {i:<3} {label:<27} {fmt_acc(acc):<8} {fmt_open(osc):<8}")
    print(f"{'='*62}")


# ── Validation ───────────────────────────────────────────────────────────
def _known_rubrics() -> set:
    """IDs de grilles connues (depuis judge_open), avec repli si indisponible."""
    try:
        import judge_open
        return set(judge_open.RUBRICS.keys())
    except Exception:  # noqa: BLE001
        return {"general_v1", "medical_v1"}


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
            is_open = item.get("type") == "open"

            if is_open:
                # Questions OUVERTES : pas d'`options` ni d'`answer`, mais une
                # réponse de référence, une grille et une méthode de notation.
                for field in ("id", "question", "category",
                              "reference_answer", "rubric_id", "scoring_method"):
                    if field not in item:
                        errors.append(f"champ manquant '{field}'")
                ref = item.get("reference_answer", "")
                if not isinstance(ref, str) or len(ref.strip()) < 10:
                    errors.append("'reference_answer' vide ou trop courte")
                if item.get("scoring_method") not in (None, "llm_judge"):
                    errors.append(f"scoring_method '{item.get('scoring_method')}' inconnu (attendu : llm_judge)")
                if "rubric_id" in item and item["rubric_id"] not in _known_rubrics():
                    errors.append(f"rubric_id '{item['rubric_id']}' inconnu. Valides : {', '.join(_known_rubrics())}")
            else:
                # Champs obligatoires (QCM)
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

            # Catégorie (commun QCM + ouvert)
            if "category" in item and item["category"] not in categories:
                valid_cats = ", ".join(categories.keys())
                errors.append(f"catégorie '{item['category']}' inconnue. Valides : {valid_cats}")

            # Difficulté (commun)
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
    """Exporte les résultats (QCM et ouvert dans DEUX colonnes distinctes)."""
    mcq = _latest_by_model(results_list, "mcq")
    opn = _latest_by_model(results_list, "open")
    # open_score par modèle (colonne SÉPARÉE du % QCM — jamais mélangés).
    open_score = {name: r["mean_score"] for name, r in opn.items()}

    sorted_models = sorted(mcq.values(), key=lambda x: x["accuracy"], reverse=True)

    if fmt == "json":
        out = []
        for r in sorted_models:
            out.append({
                "model": r["model_label"],
                "accuracy": r["accuracy"],           # QCM : % bonnes réponses
                "open_score": open_score.get(r["model"]),  # Ouvert : score juge /100
                "correct": r["correct"],
                "total": r["total"],
                "by_category": {k: {"accuracy": v["accuracy"], "correct": v["correct"], "total": v["total"]}
                                for k, v in r["by_category"].items()},
                "by_difficulty": r["by_difficulty"],
                "timestamp": r["timestamp"],
            })
        # Modèles évalués UNIQUEMENT en ouvert (pas de résultat QCM).
        for name, r in opn.items():
            if name not in mcq:
                out.append({
                    "model": r["model_label"],
                    "accuracy": None,
                    "open_score": r["mean_score"],
                    "total": r["total"],
                    "open_by_category": {k: v["mean_score"] for k, v in r["by_category"].items()},
                    "judge_version": r.get("judge_version"),
                    "timestamp": r["timestamp"],
                })
        print(json.dumps(out, indent=2, ensure_ascii=False))

    elif fmt == "csv":
        print("model,accuracy,open_score,correct,total,cat_histoire,cat_geographie,cat_economie,cat_langue_culture,cat_sante_sciences,cat_droit_politique,cat_ia_technologie,cat_societe,cat_raisonnement_culturel,easy_acc,medium_acc,hard_acc")
        for r in sorted_models:
            cats = r.get("by_category", {})
            diffs = r.get("by_difficulty", {})
            osc = open_score.get(r["model"])
            print(
                f"{r['model_label']},{r['accuracy']},{osc if osc is not None else ''},{r['correct']},{r['total']},"
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
        print("| # | Modèle | QCM (%) | Ouvert (/100) |")
        print("|---|---|---|---|")
        for i, r in enumerate(sorted_models, 1):
            osc = open_score.get(r["model"])
            osc_s = f"{osc:.1f}" if osc is not None else "—"
            print(f"| {i} | {r['model_label']} | {r['accuracy']:.1f}% | {osc_s} |")

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


def cmd_run_open(args):
    """Lance l'évaluation OUVERTE (LLM-as-judge)."""
    models = load_models()
    if args.model:
        models = [m for m in models if m["name"] == args.model]
        if not models:
            print(f"Modèle '{args.model}' introuvable. Utilisez list-models.")
            sys.exit(1)

    questions = load_open_questions(args.questions_path)
    n = 3 if args.dry_run else (args.limit or 0)
    if n:
        questions = questions[:n]

    judge_model = load_judge_config()
    if not os.environ.get(judge_model["api_key_env"]):
        print(f"ATTENTION : {judge_model['api_key_env']} (clé du modèle juge) non définie.")
    judge_call_fn = make_judge_call_fn(judge_model)

    import judge_open
    print(f"\n📖  AfriBench — Évaluation OUVERTE (LLM-as-judge)")
    print(f"    Questions ouvertes : {len(questions)}{'  [DRY-RUN]' if args.dry_run else ''}")
    print(f"    Modèles évalués    : {len(models)}")
    print(f"    Juge (FIXE)        : {judge_model.get('label')} [{judge_model.get('model_id')}]")
    print(f"    Grille             : {judge_open.JUDGE_VERSION} (température {'omise' if judge_model.get('temperature') is None else judge_model.get('temperature')})")
    print()

    for i, model in enumerate(models, 1):
        print(f"[{i}/{len(models)}] Évaluation ouverte de {model.get('label', model['name'])}...")
        try:
            results = evaluate_model_open(model, questions, judge_call_fn, judge_model, verbose=args.verbose)
            save_open_results(results)
            print_summary_open(results)
        except Exception as e:  # noqa: BLE001
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

    # run-open (évaluation LLM-as-judge des questions type=open)
    p_ro = sub.add_parser("run-open", help="Évalue les questions ouvertes (LLM-as-judge)")
    p_ro.add_argument("--model", "-m", help="Nom du modèle (optionnel, tous par défaut)")
    p_ro.add_argument("--questions-path", "-q", default=None,
                      help="Dossier des questions ouvertes (défaut : data/questions/afrimed/)")
    p_ro.add_argument("--limit", type=int, default=0, help="Limiter le nb de questions (0=toutes)")
    p_ro.add_argument("--dry-run", action="store_true", help="Essai sur 3 questions seulement")
    p_ro.add_argument("--verbose", "-v", action="store_true", help="Affiche chaque question")
    p_ro.set_defaults(func=cmd_run_open)

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
