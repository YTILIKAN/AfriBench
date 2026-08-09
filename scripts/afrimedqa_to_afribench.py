#!/usr/bin/env python3
"""
afrimedqa_to_afribench.py
--------------------------
Convertit les QCM d'AfriMed-QA (intronhealth/afrimedqa_v2) vers le schéma
de questions AfriBench.

Produit DEUX sorties, volontairement séparées du corpus d'origine pour
respecter la licence CC-BY-NC-SA 4.0 (isolation + attribution) :

  1. Un ECHANTILLON intégré à la catégorie "sante_sciences"
     -> data/questions/v1/validated/sante_sciences_afrimed.json
     (compté dans la catégorie Santé via le champ `category`,
      mais physiquement isolé pour la licence)

  2. Un MODULE dédié "AfriBench-Med" (plus large)
     -> data/questions/afrimed/afrimed_med_en.json

Langue : anglais (language="en"). La traduction FR fait l'objet d'une
seconde passe (script séparé) avec relecture humaine obligatoire.

Usage :
    pip install datasets
    python scripts/afrimedqa_to_afribench.py --sample 40 --module 250

IMPORTANT — À FAIRE AVANT DE LANCER EN PRODUCTION :
    Lancez d'abord `--inspect` pour vérifier les VRAIS noms de colonnes du
    dataset, puis ajustez le dictionnaire COLUMN_MAP ci-dessous si besoin.
    Les noms sont des suppositions raisonnables et peuvent différer.
"""

import argparse
import ast
import json
import random
import re
from pathlib import Path

try:
    from datasets import load_dataset
except ImportError:
    raise SystemExit("Installez la lib : pip install datasets")

DATASET = "intronhealth/afrimedqa_v2"

# --- Mapping des colonnes (À VÉRIFIER via --inspect) -----------------------
COLUMN_MAP = {
    "question": ["question_clean", "question"],
    "options": ["answer_options", "options", "choices"],
    "correct": ["correct_answer", "answer", "correct_option"],
    "rationale": ["answer_rationale", "rationale", "explanation"],
    "qtype": ["question_type", "type"],
    "tier": ["tier", "expertise", "contributor_type"],
    "specialty": ["specialty", "speciality", "subject"],
    "country": ["country", "region"],
    "quality": ["quality"],
    "split": ["split"],
    "sample_id": ["sample_id", "id"],
}

# Valeurs de question_type considérées comme QCM (ajuster après --inspect)
MCQ_HINTS = ["mcq", "multiple", "choice"]

ATTRIBUTION = (
    "AfriMed-QA (Olatunji et al., 2025), intronhealth/afrimedqa_v2, "
    "CC-BY-NC-SA 4.0"
)


def pick(row_keys, candidates):
    """Retourne le premier nom de colonne existant parmi les candidats."""
    for c in candidates:
        if c in row_keys:
            return c
    return None


def resolve_columns(colnames):
    resolved = {}
    for key, cands in COLUMN_MAP.items():
        resolved[key] = pick(colnames, cands)
    return resolved


def parse_options(raw):
    """
    Normalise les options en dict {"A": "...", "B": "...", ...}.
    Gère : dict, liste, ou chaîne ("A) ...\\nB) ..." / JSON / python-repr).
    """
    if raw is None:
        return None
    # dict déjà prêt
    if isinstance(raw, dict):
        keys = [str(k).strip() for k in raw.keys()]
        # cas déjà lettré : clés A/B/C... -> on normalise en majuscule
        if keys and all(re.fullmatch(r"[A-Ha-h]", k) for k in keys):
            return {k.upper(): v for k, v in zip(keys, raw.values())}
        # cas AfriMed-QA : clés "option1", "option2"... -> mapping positionnel
        letters = "ABCDEFGH"
        return {letters[i]: str(v).strip()
                for i, v in enumerate(raw.values()) if i < len(letters)}
    # liste -> A,B,C,...
    if isinstance(raw, (list, tuple)):
        letters = "ABCDEFGH"
        return {letters[i]: str(v).strip() for i, v in enumerate(raw)}
    if isinstance(raw, str):
        s = raw.strip()
        # tentative JSON / python-literal
        for loader in (json.loads, ast.literal_eval):
            try:
                val = loader(s)
                return parse_options(val)
            except Exception:
                pass
        # sinon parsing par motifs "A) ..." / "A. ..." / "A: ..."
        parts = re.split(r"(?m)^\s*([A-H])[\).:\-]\s+", s)
        if len(parts) >= 3:
            opts = {}
            it = iter(parts[1:])
            for letter, text in zip(it, it):
                opts[letter.upper()] = text.strip()
            if opts:
                return opts
    return None


def normalize_answer(correct, options):
    """
    Retourne la LETTRE de la bonne réponse.
    `correct` peut être une lettre ("B") ou le texte complet de l'option.
    """
    if correct is None or not options:
        return None
    c = str(correct).strip()
    # déjà une lettre valide
    if len(c) == 1 and c.upper() in options:
        return c.upper()
    # "B)" ou "B." en tête
    m = re.match(r"^\s*([A-H])[\).:\-]", c)
    if m and m.group(1).upper() in options:
        return m.group(1).upper()
    # cas AfriMed-QA : "option4" (référence positionnelle) -> lettre
    # NB : les réponses multiples ("option2,option4") ne matchent pas
    #      volontairement -> question ignorée (schéma AfriBench = 1 lettre).
    m2 = re.fullmatch(r"\s*option\s*(\d+)\s*", c, re.IGNORECASE)
    if m2:
        letters = "ABCDEFGH"
        pos = int(m2.group(1)) - 1
        if 0 <= pos < len(letters) and letters[pos] in options:
            return letters[pos]
    # sinon, matcher sur le texte de l'option
    for letter, text in options.items():
        if str(text).strip().lower() == c.lower():
            return letter
    return None


def is_mcq(qtype_val):
    if qtype_val is None:
        return False
    v = str(qtype_val).lower()
    return any(h in v for h in MCQ_HINTS)


def to_afribench(row, cols, idx, id_prefix):
    q_txt = row.get(cols["question"]) if cols["question"] else None
    options = parse_options(row.get(cols["options"])) if cols["options"] else None
    correct = row.get(cols["correct"]) if cols["correct"] else None
    answer = normalize_answer(correct, options)

    # garde-fous : QCM exploitable uniquement
    if not q_txt or not options or len(options) < 3 or answer is None:
        return None

    rationale = row.get(cols["rationale"]) if cols["rationale"] else ""
    specialty = row.get(cols["specialty"]) if cols["specialty"] else ""
    country = row.get(cols["country"]) if cols["country"] else ""
    src_id = row.get(cols["sample_id"]) if cols["sample_id"] else ""

    return {
        "id": f"{id_prefix}-{idx:04d}",
        "category": "sante_sciences",
        "subcategory": str(specialty).strip().lower().replace(" ", "_") or "medecine",
        "difficulty": "hard",
        "language": "en",
        "question": str(q_txt).strip(),
        "options": options,
        "answer": answer,
        "explanation": (str(rationale).strip() or "See AfriMed-QA rationale."),
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
    ap.add_argument("--inspect", action="store_true",
                    help="Affiche colonnes + 2 exemples puis quitte")
    ap.add_argument("--sample", type=int, default=40,
                    help="Nb de questions pour l'échantillon sante_sciences")
    ap.add_argument("--module", type=int, default=250,
                    help="Nb de questions pour le module AfriBench-Med")
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    print(f"Chargement de {DATASET} ...")
    ds = load_dataset(DATASET)
    # concatène tous les splits disponibles
    rows = []
    for split_name in ds:
        rows.extend(list(ds[split_name]))
    print(f"{len(rows)} lignes chargées.")

    colnames = list(rows[0].keys()) if rows else []
    cols = resolve_columns(colnames)

    if args.inspect:
        print("\n=== COLONNES DISPONIBLES ===")
        print(colnames)
        print("\n=== MAPPING RÉSOLU ===")
        for k, v in cols.items():
            print(f"  {k:12} -> {v}")
        print("\n=== 2 EXEMPLES ===")
        for r in rows[:2]:
            print(json.dumps(r, ensure_ascii=False, indent=2)[:1500])
            print("---")
        return

    # filtrage QCM + qualité
    qtype_col = cols["qtype"]
    quality_col = cols["quality"]
    mcqs = []
    for r in rows:
        if qtype_col and not is_mcq(r.get(qtype_col)):
            continue
        if quality_col and r.get(quality_col) in (False, 0, "False", "false"):
            continue
        mcqs.append(r)
    print(f"{len(mcqs)} QCM candidats après filtrage.")

    random.seed(args.seed)
    random.shuffle(mcqs)

    total_needed = args.sample + args.module
    converted = []
    idx_sample = 11   # SANTE existant s'arrête à SANTE-010
    idx_module = 1
    sample_out, module_out = [], []

    for r in mcqs:
        if len(sample_out) < args.sample:
            item = to_afribench(r, cols, idx_sample, "SANTE-AMQ")
            if item:
                sample_out.append(item)
                idx_sample += 1
            continue
        if len(module_out) < args.module:
            item = to_afribench(r, cols, idx_module, "MED")
            if item:
                module_out.append(item)
                idx_module += 1
            continue
        break

    # écriture
    base = Path("data/questions")
    sample_path = base / "v1" / "validated" / "sante_sciences_afrimed.json"
    module_dir = base / "afrimed"
    module_dir.mkdir(parents=True, exist_ok=True)
    module_path = module_dir / "afrimed_med_en.json"

    sample_path.write_text(
        json.dumps(sample_out, ensure_ascii=False, indent=2), encoding="utf-8")
    module_path.write_text(
        json.dumps(module_out, ensure_ascii=False, indent=2), encoding="utf-8")

    # fichier d'attribution obligatoire (CC-BY-NC-SA)
    (module_dir / "ATTRIBUTION.md").write_text(
        "# Attribution — AfriMed-QA\n\n"
        "Les questions de ce module et du fichier "
        "`v1/validated/sante_sciences_afrimed.json` sont dérivées de :\n\n"
        "**AfriMed-QA** (Olatunji et al., 2025), "
        "`intronhealth/afrimedqa_v2`.\n\n"
        "Licence : **CC-BY-NC-SA 4.0** (Attribution — NonCommercial — "
        "ShareAlike). Usage non commercial. Les dérivés doivent conserver "
        "cette licence.\n\n"
        "Consortium : Intron Health, SisonkeBiotik, BioRAMP, Georgia "
        "Institute of Technology, MasakhaneNLP, Google Research. "
        "Financement : Google Research, Bill & Melinda Gates Foundation, "
        "PATH.\n",
        encoding="utf-8")

    print(f"\n✓ Échantillon santé : {len(sample_out)} -> {sample_path}")
    print(f"✓ Module AfriBench-Med : {len(module_out)} -> {module_path}")
    print(f"✓ Attribution : {module_dir / 'ATTRIBUTION.md'}")
    print("\nProchaine étape : passe de traduction FR (avec relecture "
          "médicale humaine).")


if __name__ == "__main__":
    main()
