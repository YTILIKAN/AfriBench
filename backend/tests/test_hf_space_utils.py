"""Smoke test des utilitaires du Space Gradio (sans lancer Gradio)."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
UTILS = REPO / "hf_space" / "utils.py"


def _load():
    # pandas may be missing in backend venv — skip softly
    try:
        import pandas  # noqa: F401
    except ImportError:
        return None
    spec = importlib.util.spec_from_file_location("hf_space_utils", UTILS)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    # Ensure sibling imports not required
    sys.modules["hf_space_utils"] = mod
    spec.loader.exec_module(mod)
    return mod


def test_leaderboard_utils():
    mod = _load()
    if mod is None:
        return
    models = mod.latest_by_model()
    assert len(models) >= 1
    df = mod.leaderboard_df()
    assert not df.empty
    assert "Score (%)" in df.columns
    stats = mod.stats_summary()
    assert stats["n_models"] >= 1
