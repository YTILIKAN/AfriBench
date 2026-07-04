#!/usr/bin/env python3
"""
afrimedqa_saq_to_afribench.py
-----------------------------
Extrait les questions OUVERTES à réponse courte (SAQ) d'AfriMed-QA
(intronhealth/afrimedqa_v2) vers le schéma de questions OUVERTES d'AfriBench
(voir data/questions/template_open.json).

Sortie (isolée pour la licence CC-BY-NC-SA 4.0) :
  data/questions/afrimed/afrimed_saq_en.json

Chaque item : question + reference_answer (le rationale/réponse de référence),
type="open", rubric_id="medical_v1", scoring_method="llm_judge", language="en".

NB : les `key_points` ne sont pas fournis par le dataset et sont laissés vides.
Une passe ultérieure (LLM + relecture) pourra les extraire de reference_answer
pour améliorer la notation du juge.

Usage :
    pip install datasets
    python scripts/afrimedqa_saq_to_afribench.py --inspect
    python scripts/afrimedqa_saq_to_afribench.py --limit 200
"""

import argparse
import json
import random
from pathlib import Path

try:
    from datasets import load_dataset
except ImportError:
    raise SystemExit("Installez la lib : pip install datasets")

DATASET = "intronhealth/afrimedqa_v2"

# À VÉRIFIER via --inspect (mêmes candidats que le convertisseur QCM)
COLUMN_MAP = {
    "question": ["question_clean", "question"],
    "reference": ["answer_rationale", "reference_answer", "answer", "rationale"],
    "qtype": ["question_type", "type"],
    "tier": ["tier", "expertise", "contributor_type"],
    "specialty": ["specialty", "speciality", "subject"],
    "country": ["country", "region"],
    "quality": ["quality"],
    "sample_id": ["sample_id", "id"],
}

# Indices identifiant une SAQ (réponse ouverte courte). À ajuster après inspect.
SAQ_HINTS = ["saq", "short answer", "short-answer", "open", "essay"]
# On exclut explicitement les consumer queries (CQ) et les QCM.
EXCLUDE_HINTS = ["mcq", "multiple", "choice", "consumer", "cq"]

ATTRIBUTION = (
    "AfriMed-QA (Olatunji et al., 2025), intronhealth/afrimedqa_v2, "
    "CC-BY-NC-SA 4.0"
)


def pick(keys, candidates):
    for c in candidates:
        if c in keys:
            return c
    return None


def resolve_columns(colnames):
    return {k: pick(colnames, cands) for k, cands in COLUMN_MAP.items()}


def is_saq(qtype_val):
    if qtype_val is None:
        return False
    v = str(qtype_val).lower()
    if any(x in v for x in EXCLUDE_HINTS):
        return False
    return any(h in v for h in SAQ_HINTS)


def to_open_item(row, cols, idx):
    q = row.get(cols["question"]) if cols["question"] else None
    ref = row.get(cols["reference"]) if cols["reference"] else None
    if not q or not ref or len(str(ref).strip()) < 20:
        return None
    specialty = row.get(cols["specialty"]) if cols["specialty"] else ""
    country = row.get(cols["country"]) if cols["country"] else ""
    src_id = row.get(cols["sample_id"]) if cols["sample_id"] else ""
    return {
        "id": f"MED-SAQ-{idx:04d}",
        "category": "sante_sciences",
        "subcategory": str(specialty).strip().lower().replace(" ", "_") or "medecine",
        "type": "open",
        "difficulty": "hard",
        "language": "en",
        "question": str(q).strip(),
        "reference_answer": str(ref).strip(),
        "key_points": [],
        "rubric_id": "medical_v1",
        "scoring_method": "llm_judge",
        "source": ATTRIBUTION,
        "author": "afrimedqa",
        "license": "CC-BY-NC-SA-4.0",
        "provenance": {
            "dataset": DATASET,
            "sample_id": str(src_id),
            "country": str(country),
        },
        "date_created": "2026-07-03",
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--inspect", action="store_true")
    ap.add_argument("--limit", type=int, default=200,
                    help="Nb max de SAQ à extraire")
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    print(f"Chargement de {DATASET} ...")
    ds = load_dataset(DATASET)
    rows = []
    for split in ds:
        rows.extend(list(ds[split]))
    print(f"{len(rows)} lignes chargées.")

    colnames = list(rows[0].keys()) if rows else []
    cols = resolve_columns(colnames)

    if args.inspect:
        print("\n=== COLONNES ===")
        print(colnames)
        print("\n=== MAPPING RÉSOLU ===")
        for k, v in cols.items():
            print(f"  {k:12} -> {v}")
        # aperçu des valeurs de question_type pour caler SAQ_HINTS
        if cols["qtype"]:
            vals = {}
            for r in rows:
                vals[str(r.get(cols["qtype"]))] = vals.get(str(r.get(cols["qtype"])), 0) + 1
            print("\n=== VALEURS DE question_type (comptes) ===")
            for k, v in sorted(vals.items(), key=lambda x: -x[1]):
                print(f"  {k!r:40} {v}")
        return

    qcol = cols["qtype"]
    quality_col = cols["quality"]
    saqs = []
    for r in rows:
        if qcol and not is_saq(r.get(qcol)):
            continue
        if quality_col and r.get(quality_col) in (False, 0, "False", "false"):
            continue
        saqs.append(r)
    print(f"{len(saqs)} SAQ candidates après filtrage.")

    random.seed(args.seed)
    random.shuffle(saqs)

    out, idx = [], 1
    for r in saqs:
        if len(out) >= args.limit:
            break
        item = to_open_item(r, cols, idx)
        if item:
            out.append(item)
            idx += 1

    module_dir = Path("data/questions/afrimed")
    module_dir.mkdir(parents=True, exist_ok=True)
    path = module_dir / "afrimed_saq_en.json"
    path.write_text(json.dumps(out, ensure_ascii=False, indent=2),
                    encoding="utf-8")
    print(f"\n[OK] {len(out)} questions ouvertes -> {path}")
    print("Rappel : passe FR + extraction des key_points + relecture "
          "médicale à prévoir.")


if __name__ == "__main__":
    main()
