"""Seed versionné : colonnes seed_version et locked_by_admin sur questions."""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "003_seed_version"
down_revision: Union[str, None] = "002_durable_jobs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    cols = [c["name"] for c in inspect(bind).get_columns(table)]
    return column in cols


def upgrade() -> None:
    if not _has_column("questions", "seed_version"):
        op.add_column(
            "questions",
            sa.Column("seed_version", sa.Integer(), nullable=False, server_default="0"),
        )
    if not _has_column("questions", "locked_by_admin"):
        op.add_column(
            "questions",
            sa.Column(
                "locked_by_admin",
                sa.Boolean(),
                nullable=False,
                server_default="false",
            ),
        )


def downgrade() -> None:
    op.drop_column("questions", "locked_by_admin")
    op.drop_column("questions", "seed_version")
