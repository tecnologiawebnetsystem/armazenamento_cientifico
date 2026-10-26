"""Widen activity log entity identifiers.

Revision ID: 20261026_4f7c1a2b9d30
Revises: 20261020_8c918034d522
"""

import sqlalchemy as sa

from alembic import op


revision = "20261026_4f7c1a2b9d30"
down_revision = "20261020_8c918034d522"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "activity_logs",
        "entity_id",
        existing_type=None,
        type_=sa.String(length=255),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "activity_logs",
        "entity_id",
        existing_type=None,
        type_=sa.String(length=36),
        existing_nullable=True,
    )
