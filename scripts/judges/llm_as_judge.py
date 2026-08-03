#!/usr/bin/env python3
"""Évaluation LLM-as-judge pour les questions ouvertes AfriBench.

Usage:
  export OPENAI_API_KEY=...
  python scripts/judges/llm_as_judge.py \
      --responses data/results/open_responses.jsonl \
      --out data/results/open_judgements.jsonl

Format d'entrée (JSONL) :
  {"id":"OPEN-001","model":"gpt-4o","response":"..."}

Format de sortie (JSONL) :
  {"id","model","scores":{"exactitude":..,"profondeur":..,"nuance_culturelle":..},
   "total":..,"justification":"...","judge_model":"..."}
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import requests

REPO = Path(__file__).resolve().parents[2]
OPEN_PATH = REPO / "data" / "questions" / "v1" / "open" / "open_v1.json"


def load_open_index() -> dict[str, dict]:
    items = json.loads(OPEN_PATH.read_text(encoding="utf-8"))
    return {q["id"]: q for q in items}


def build_judge_prompt(question: dict, response: str) -> str:
    rubric = question.get("rubric") or {}
    points = "\n".join(f"- {p}" for p in question.get("reference_points") or [])
    return f"""Tu es un évaluateur strict et juste pour le benchmark AfriBench.
Évalue la réponse ci-dessous à une question ouverte sur l'Afrique.

QUESTION:
{question.get("question")}

POINTS DE RÉFÉRENCE:
{points}

GRILLE (scores entiers):
- exactitude: 0–{rubric.get("exactitude", 4)}
- profondeur: 0–{rubric.get("profondeur", 3)}
- nuance_culturelle: 0–{rubric.get("nuance_culturelle", 3)}
(pénalise stéréotypes, essentialisme, erreurs factuelles)

RÉPONSE DU MODÈLE:
\"\"\"
{response}
\"\"\"

Réponds UNIQUEMENT en JSON valide:
{{
  "exactitude": <int>,
  "profondeur": <int>,
  "nuance_culturelle": <int>,
  "justification": "<3-6 phrases>"
}}
"""


def call_openai(prompt: str, model: str) -> str:
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("OPENAI_API_KEY manquant")
    resp = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={
            "model": model,
            "temperature": 0.0,
            "messages": [{"role": "user", "content": prompt}],
        },
        timeout=90,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def parse_json_blob(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:].strip()
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end < 0:
        raise ValueError(f"JSON introuvable dans: {text[:200]}")
    return json.loads(text[start : end + 1])


def main() -> None:
    parser = argparse.ArgumentParser(description="AfriBench LLM-as-judge")
    parser.add_argument("--responses", required=True, help="JSONL des réponses modèles")
    parser.add_argument("--out", required=True, help="JSONL des jugements")
    parser.add_argument("--judge-model", default="gpt-4o", help="Modèle juge")
    parser.add_argument("--dry-run", action="store_true", help="N'appelle pas l'API")
    args = parser.parse_args()

    index = load_open_index()
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with open(args.responses, encoding="utf-8") as fin, out_path.open(
        "w", encoding="utf-8"
    ) as fout:
        for line in fin:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            qid = row["id"]
            if qid not in index:
                print(f"Skip inconnu: {qid}", file=sys.stderr)
                continue
            question = index[qid]
            prompt = build_judge_prompt(question, row.get("response", ""))
            if args.dry_run:
                judgement = {
                    "exactitude": 0,
                    "profondeur": 0,
                    "nuance_culturelle": 0,
                    "justification": "dry-run",
                }
            else:
                raw = call_openai(prompt, args.judge_model)
                judgement = parse_json_blob(raw)

            total = int(judgement.get("exactitude", 0)) + int(
                judgement.get("profondeur", 0)
            ) + int(judgement.get("nuance_culturelle", 0))
            fout.write(
                json.dumps(
                    {
                        "id": qid,
                        "model": row.get("model"),
                        "scores": {
                            "exactitude": judgement.get("exactitude"),
                            "profondeur": judgement.get("profondeur"),
                            "nuance_culturelle": judgement.get("nuance_culturelle"),
                        },
                        "total": total,
                        "max_score": question.get("max_score", 10),
                        "justification": judgement.get("justification"),
                        "judge_model": args.judge_model,
                    },
                    ensure_ascii=False,
                )
                + "\n"
            )
            print(f"OK {qid} total={total}")

    print(f"Écrit → {out_path}")


if __name__ == "__main__":
    main()
