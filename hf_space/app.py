#!/usr/bin/env python3
"""AfriBench — Leaderboard Gradio (Hugging Face Space).

Local :
  cd hf_space && pip install -r requirements.txt
  python app.py

Space HF : ce dossier est la racine de l'app (voir README.md).
"""

from __future__ import annotations

import gradio as gr
import plotly.express as px

from about import ABOUT_MD
from utils import category_matrix_df, leaderboard_df, stats_summary

THEME = gr.themes.Soft(primary_hue="orange", neutral_hue="stone")


def build_leaderboard(open_only: bool):
    df = leaderboard_df(open_only=open_only)
    stats = stats_summary()
    corpus = stats.get("corpus_questions")
    eval_n = stats.get("n_questions")
    seed_note = ""
    if stats.get("seed_mismatch"):
        seed_note = (
            f" ⚠️ Scores basés sur **{eval_n}** questions (seed) alors que le corpus "
            f"en compte **{corpus}** — re-run requis."
        )
    elif corpus:
        seed_note = f" · corpus **{corpus}** QCM"
    banner = (
        f"**Prototype v0.1 (indicatif)** — "
        f"{stats['n_models']} modèles · eval n≈{eval_n} · "
        f"Top : **{stats['top_model']}** ({stats['top_score']}%) · "
        f"moyenne {stats['avg_score']}%{seed_note}"
    )
    return banner, df


def build_category_view():
    df = category_matrix_df()
    if df.empty:
        return df, None
    melted = df.melt(id_vars=["Modèle"], var_name="Catégorie", value_name="Score (%)")
    fig = px.imshow(
        df.set_index("Modèle"),
        aspect="auto",
        color_continuous_scale="YlOrBr",
        labels={"color": "Score (%)"},
        title="Scores par catégorie",
    )
    fig.update_layout(margin=dict(l=20, r=20, t=50, b=20), height=420)
    return melted, fig


def create_app() -> gr.Blocks:
    with gr.Blocks(theme=THEME, title="AfriBench Leaderboard") as demo:
        gr.Markdown(
            """
            # AfriBench Leaderboard
            Évaluer les LLMs sur les réalités africaines — [GitHub](https://github.com/YTILIKAN/AfriBench) · [YTILIKAN](https://ytilikan.com)
            """
        )

        with gr.Tab("Classement"):
            open_only = gr.Checkbox(label="Open weights uniquement", value=False)
            banner = gr.Markdown()
            table = gr.Dataframe(interactive=False, wrap=True)
            open_only.change(build_leaderboard, inputs=open_only, outputs=[banner, table])
            demo.load(build_leaderboard, inputs=open_only, outputs=[banner, table])

        with gr.Tab("Par catégorie"):
            cat_table = gr.Dataframe(interactive=False, wrap=True)
            cat_plot = gr.Plot()
            refresh = gr.Button("Rafraîchir")
            refresh.click(build_category_view, outputs=[cat_table, cat_plot])
            demo.load(build_category_view, outputs=[cat_table, cat_plot])

        with gr.Tab("À propos"):
            gr.Markdown(ABOUT_MD)

        gr.Markdown(
            "<center><small>Données locales / export frontend · "
            "Soumissions de modèles via le dépôt GitHub</small></center>"
        )
    return demo


if __name__ == "__main__":
    app = create_app()
    app.launch(server_name="0.0.0.0", server_port=7860)
