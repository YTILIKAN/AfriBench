#!/usr/bin/env python3
"""Exporte AfriBench au format Hugging Face (JSONL + carte dataset).

Usage:
  python scripts/export_hf_dataset.py
  # → data/hf/YTILIKAN__AfriBench/

Publication (optionnel, nécessite `huggingface_hub` + token) :
  huggingface-cli login
  python scripts/export_hf_dataset.py --push
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
VALIDATED = REPO_ROOT / "data" / "questions" / "v1" / "validated"
WITNESS = REPO_ROOT / "data" / "questions" / "v1" / "witness"
OUT_DIR = REPO_ROOT / "data" / "hf" / "YTILIKAN__AfriBench"


def load_json_dir(path: Path) -> list[dict]:
    items: list[dict] = []
    if not path.exists():
        return items
    for fpath in sorted(path.glob("*.json")):
        if fpath.name == "template.json":
            continue
        with fpath.open(encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            items.extend(data)
        elif isinstance(data, dict):
            items.append(data)
    return items


def normalize(q: dict, *, is_control: bool) -> dict:
    options = q.get("options") or {}
    row = {
        "id": q.get("id"),
        "category": q.get("category"),
        "subcategory": q.get("subcategory"),
        "difficulty": q.get("difficulty"),
        "language": q.get("language", "fr"),
        "question": q.get("question"),
        "option_a": options.get("A"),
        "option_b": options.get("B"),
        "option_c": options.get("C"),
        "option_d": options.get("D"),
        "answer": str(q.get("answer", "")).strip().upper(),
        "explanation": q.get("explanation"),
        "source": q.get("source"),
        "is_control": bool(q.get("is_control", is_control)),
        "date_created": q.get("date_created"),
    }
    return row


def write_jsonl(path: Path, rows: list[dict]) -> None:
    with path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def build_dataset_card(african: list[dict], control: list[dict]) -> str:
    all_rows = african + control
    by_cat = Counter(r["category"] for r in african)
    by_diff = Counter(r["difficulty"] for r in african)
    cats = "\n".join(f"| {k} | {v} |" for k, v in sorted(by_cat.items()))
    diffs = "\n".join(f"| {k} | {v} |" for k, v in sorted(by_diff.items()))
    return f"""---
language:
- fr
license: other
task_categories:
- multiple-choice
- question-answering
pretty_name: AfriBench
tags:
- african
- benchmark
- french
- qcm
- multiple-choice
- africa
size_categories:
- n<1K
---

# AfriBench

Benchmark public pour évaluer les modèles de langage sur les **réalités africaines**
(histoire, géographie, culture, droit, santé, économie, IA, société).

Porté par [YTILIKAN](https://ytilikan.com) · repo : [YTILIKAN/AfriBench](https://github.com/YTILIKAN/AfriBench)

> **Statut : prototype v0.1** — l'échantillon reste trop petit pour des conclusions
> statistiquement fortes. Les scores sont indicatifs.

## Splits

| Split | Description | N |
|-------|-------------|---|
| `african` | Questions ancrées Afrique (benchmark principal) | {len(african)} |
| `control` | Questions témoins non-africaines (baseline) | {len(control)} |

## Schéma

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | string | Identifiant (ex. `HIST-001`) |
| `category` | string | Catégorie thématique |
| `subcategory` | string | Sous-thème |
| `difficulty` | string | `easy` / `medium` / `hard` |
| `language` | string | Code langue (`fr`) |
| `question` | string | Énoncé |
| `option_a`…`option_d` | string | Propositions |
| `answer` | string | Lettre correcte (`A`–`D`) |
| `explanation` | string | Justification |
| `source` | string | Référence |
| `is_control` | bool | `true` pour les témoins |
| `date_created` | string | Date ISO |

## Répartition (split `african`)

### Par catégorie

| Catégorie | N |
|-----------|---|
{cats}

### Par difficulté

| Difficulté | N |
|------------|---|
{diffs}

## Chargement

```python
from datasets import load_dataset

# Après publication sur le Hub :
# ds = load_dataset("YTILIKAN/AfriBench")

# En local :
from pathlib import Path
import json

def load_jsonl(path):
    with open(path, encoding="utf-8") as f:
        return [json.loads(line) for line in f]

african = load_jsonl("african.jsonl")
control = load_jsonl("control.jsonl")
```

## Citation

```bibtex
@misc{{afribench2026,
  title  = {{{{AfriBench: Evaluating Language Models on African Realities}}}},
  author = {{{{YTILIKAN}}}},
  year   = {{{{2026}}}},
  url    = {{{{https://github.com/YTILIKAN/AfriBench}}}},
  note   = {{{{Prototype v0.1 — {len(all_rows)} items ({len(african)} african + {len(control)} control)}}}}
}}
```

## Licence / contribution

Voir le dépôt GitHub. Contributions de questions et validations bienvenues.
Carte générée le {date.today().isoformat()}.
"""


def maybe_push(out_dir: Path) -> None:
    try:
        from datasets import Dataset, DatasetDict
    except ImportError:
        print("datasets non installé — skip --push (pip install datasets huggingface_hub)")
        return

    def rows_to_ds(path: Path):
        rows = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
        return Dataset.from_list(rows)

    ds = DatasetDict(
        {
            "african": rows_to_ds(out_dir / "african.jsonl"),
            "control": rows_to_ds(out_dir / "control.jsonl"),
        }
    )
    ds.push_to_hub("YTILIKAN/AfriBench", private=False)
    print("Pushed to https://huggingface.co/datasets/YTILIKAN/AfriBench")


def main() -> None:
    parser = argparse.ArgumentParser(description="Export Hugging Face dataset")
    parser.add_argument("--push", action="store_true", help="Push vers le Hub (nécessite login)")
    parser.add_argument(
        "--out",
        type=Path,
        default=OUT_DIR,
        help=(
            "Répertoire de sortie (défaut : data/hf/YTILIKAN__AfriBench). "
            "Permet aux tests d'écrire dans un dossier temporaire au lieu de "
            "modifier les fichiers versionnés du dépôt."
        ),
    )
    args = parser.parse_args()
    out_dir: Path = args.out

    african_raw = load_json_dir(VALIDATED)
    control_raw = load_json_dir(WITNESS)
    african = [normalize(q, is_control=False) for q in african_raw]
    control = [normalize(q, is_control=True) for q in control_raw]

    if not african:
        print("Aucune question africaine trouvée.", file=sys.stderr)
        sys.exit(1)

    out_dir.mkdir(parents=True, exist_ok=True)
    write_jsonl(out_dir / "african.jsonl", african)
    write_jsonl(out_dir / "control.jsonl", control)

    card = build_dataset_card(african, control)
    (out_dir / "README.md").write_text(card, encoding="utf-8")
    # Copie à la racine data/ pour découverte, seulement pour l'export canonique.
    if out_dir == OUT_DIR:
        (REPO_ROOT / "data" / "DATASET_CARD.md").write_text(card, encoding="utf-8")

    meta = {
        "name": "YTILIKAN/AfriBench",
        "version": "0.1",
        "african": len(african),
        "control": len(control),
        "total": len(african) + len(control),
    }
    (out_dir / "dataset_info.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    print(f"Export HF → {out_dir}")
    print(f"  african.jsonl : {len(african)}")
    print(f"  control.jsonl : {len(control)}")
    print(f"  README.md / data/DATASET_CARD.md")

    if args.push:
        maybe_push(out_dir)


if __name__ == "__main__":
    main()
