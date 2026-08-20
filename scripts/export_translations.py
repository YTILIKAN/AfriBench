#!/usr/bin/env python3
"""Exporte les pilotes de traduction (hors scores officiels).

Usage:
  python scripts/export_translations.py
  python scripts/export_translations.py --lang sw
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
ROOT = REPO / "data" / "questions" / "v1" / "translations"
OUT = REPO / "data" / "translations_export"


def load_lang(lang: str) -> list[dict]:
    folder = ROOT / lang
    items: list[dict] = []
    if not folder.exists():
        return items
    for path in sorted(folder.glob("*.json")):
        items.extend(json.loads(path.read_text(encoding="utf-8")))
    return items


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--lang", choices=["sw", "yo", "am", "all"], default="all")
    p.add_argument("--verified-only", action="store_true", help="N exporter que les traductions verified")
    args = p.parse_args()
    langs = ["sw", "yo", "am"] if args.lang == "all" else [args.lang]
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {"official": False, "note": "draft_mt_unverified excluded from leaderboard", "langs": {}}
    for lang in langs:
        items = load_lang(lang)
        if args.verified_only:
            items = [q for q in items if q.get("translation_status") == "verified"]
        verified = [q for q in items if q.get("translation_status") == "verified"]
        drafts = [q for q in items if q.get("translation_status") != "verified"]
        out = OUT / f"{lang}.json"
        out.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        manifest["langs"][lang] = {
            "total": len(items),
            "verified": len(verified),
            "draft_unverified": len(drafts),
            "path": str(out.relative_to(REPO)),
        }
        print(f"{lang}: {len(items)} total ({len(verified)} verified, {len(drafts)} draft) → {out}")
    (OUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Manifest → {OUT / 'manifest.json'}")


if __name__ == "__main__":
    main()
