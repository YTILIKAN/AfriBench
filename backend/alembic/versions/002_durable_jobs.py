"""Jobs d'évaluation et rate-limit persistants."""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

revision: str = "002_durable_jobs"
down_revision: Union[str, None] = "001_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return name in inspect(bind).get_table_names()


def upgrade() -> None:
    if not _has_table("eval_jobs"):
        op.create_table(
            "eval_jobs",
            sa.Column("job_id", sa.String(length=32), nullable=False),
            sa.Column("status", sa.String(length=16), nullable=False, server_default="queued"),
            sa.Column("model", sa.String(length=128), nullable=False),
            sa.Column("few_shot", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("limit", sa.Integer(), nullable=True),
            sa.Column("category", sa.String(length=64), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("error", sa.Text(), nullable=True),
            sa.Column("result_summary", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("result_path", sa.Text(), nullable=True),
            sa.Column("worker_id", sa.String(length=128), nullable=True),
            sa.PrimaryKeyConstraint("job_id"),
        )
        op.create_index("ix_eval_jobs_status", "eval_jobs", ["status"])
        op.create_index("ix_eval_jobs_created_at", "eval_jobs", ["created_at"])

    if not _has_table("rate_limit_hits"):
        op.create_table(
            "rate_limit_hits",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("key", sa.String(length=512), nullable=False),
            sa.Column(
                "hit_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_rate_limit_hits_key", "rate_limit_hits", ["key"])
        op.create_index("ix_rate_limit_hits_hit_at", "rate_limit_hits", ["hit_at"])


def downgrade() -> None:
    op.drop_index("ix_rate_limit_hits_hit_at", table_name="rate_limit_hits")
    op.drop_index("ix_rate_limit_hits_key", table_name="rate_limit_hits")
    op.drop_table("rate_limit_hits")
    op.drop_index("ix_eval_jobs_created_at", table_name="eval_jobs")
    op.drop_index("ix_eval_jobs_status", table_name="eval_jobs")
    op.drop_table("eval_jobs")
