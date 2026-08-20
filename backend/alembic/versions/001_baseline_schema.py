"""Tables de base : questions, results, models.

Pour une base déjà créée via create_all(), exécuter avant upgrade :
  alembic stamp 001_baseline
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

revision: str = "001_baseline"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return name in inspect(bind).get_table_names()


def upgrade() -> None:
    if not _has_table("questions"):
        op.create_table(
            "questions",
            sa.Column("id", sa.String(length=64), nullable=False),
            sa.Column("category", sa.String(length=64), nullable=False),
            sa.Column("subcategory", sa.String(length=128), nullable=True),
            sa.Column("difficulty", sa.String(length=16), nullable=True),
            sa.Column("language", sa.String(length=8), nullable=False),
            sa.Column("question", sa.Text(), nullable=False),
            sa.Column("options", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
            sa.Column("answer", sa.String(length=8), nullable=True),
            sa.Column("explanation", sa.Text(), nullable=True),
            sa.Column("source", sa.Text(), nullable=True),
            sa.Column("author", sa.String(length=128), nullable=True),
            sa.Column("date_created", sa.String(length=32), nullable=True),
            sa.Column("date_validated", sa.String(length=32), nullable=True),
            sa.Column("validated_by", sa.String(length=128), nullable=True),
            sa.Column("is_control", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_questions_category", "questions", ["category"])

    if not _has_table("results"):
        op.create_table(
            "results",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("model", sa.String(length=128), nullable=False),
            sa.Column("model_label", sa.String(length=128), nullable=True),
            sa.Column("timestamp", sa.String(length=64), nullable=False),
            sa.Column("total", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("correct", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("incorrect", sa.Integer(), nullable=True),
            sa.Column("no_answer", sa.Integer(), nullable=True),
            sa.Column("accuracy", sa.Float(), nullable=True),
            sa.Column("by_category", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
            sa.Column("by_difficulty", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
            sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("model", "timestamp", name="uq_results_model_timestamp"),
        )
        op.create_index("ix_results_model", "results", ["model"])

    if not _has_table("models"):
        op.create_table(
            "models",
            sa.Column("name", sa.String(length=128), nullable=False),
            sa.Column("label", sa.String(length=128), nullable=True),
            sa.Column("provider", sa.String(length=32), nullable=False, server_default="openai"),
            sa.Column("model_id", sa.String(length=256), nullable=False, server_default=""),
            sa.Column("api_base", sa.String(length=256), nullable=True),
            sa.Column("api_key", sa.Text(), nullable=True),
            sa.Column("api_key_env", sa.String(length=64), nullable=True),
            sa.Column("max_tokens", sa.Integer(), nullable=False, server_default="256"),
            sa.Column("temperature", sa.Float(), nullable=False, server_default="0"),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("name"),
        )


def downgrade() -> None:
    op.drop_table("models")
    op.drop_table("results")
    op.drop_index("ix_questions_category", table_name="questions")
    op.drop_table("questions")
