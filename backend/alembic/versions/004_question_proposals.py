"""Hub communautaire : propositions de questions et votes."""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

revision: str = "004_question_proposals"
down_revision: Union[str, None] = "003_seed_version"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(table: str) -> bool:
    return table in inspect(op.get_bind()).get_table_names()


def upgrade() -> None:
    if not _has_table("question_proposals"):
        op.create_table(
            "question_proposals",
            sa.Column("id", sa.String(length=32), primary_key=True),
            sa.Column("category", sa.String(length=64), nullable=False),
            sa.Column("difficulty", sa.String(length=16), nullable=False),
            sa.Column("question", sa.Text(), nullable=False),
            sa.Column(
                "options",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'{}'::jsonb"),
            ),
            sa.Column("answer", sa.String(length=8), nullable=False),
            sa.Column("explanation", sa.Text(), nullable=False),
            sa.Column("source", sa.Text(), nullable=False),
            sa.Column("author", sa.String(length=80), nullable=True),
            sa.Column(
                "status", sa.String(length=16), nullable=False, server_default="pending"
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.now(),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.now(),
            ),
        )
        op.create_index(
            "ix_question_proposals_category", "question_proposals", ["category"]
        )
        op.create_index(
            "ix_question_proposals_status", "question_proposals", ["status"]
        )

    if not _has_table("proposal_votes"):
        op.create_table(
            "proposal_votes",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "proposal_id",
                sa.String(length=32),
                sa.ForeignKey("question_proposals.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("voter_hash", sa.String(length=64), nullable=False),
            sa.Column("value", sa.Integer(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.now(),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.now(),
            ),
            sa.UniqueConstraint(
                "proposal_id", "voter_hash", name="uq_proposal_voter"
            ),
        )
        op.create_index("ix_proposal_votes_proposal_id", "proposal_votes", ["proposal_id"])


def downgrade() -> None:
    op.drop_table("proposal_votes")
    op.drop_table("question_proposals")
