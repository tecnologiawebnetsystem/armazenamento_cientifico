"""Persist the latest folder ACL and resolved directory members.

Revision ID: 2bf96c1a3d47
Revises: 9d2c4a71e6f3
Create Date: 2026-11-26
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "2bf96c1a3d47"
down_revision: str | None = "9d2c4a71e6f3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SCHEMA = "a25034"
RUNTIME_ROLE = '"a25034d_aplicacao"'


def upgrade() -> None:
    op.create_table(
        "project_folder_access_snapshots",
        sa.Column("project_id", sa.String(length=36), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "synced_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["project_id"], [f"{SCHEMA}.projects.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("project_id"),
        schema=SCHEMA,
    )
    op.create_table(
        "project_folder_access_members",
        sa.Column("project_id", sa.String(length=36), nullable=False),
        sa.Column("entry_key", sa.String(length=64), nullable=False),
        sa.Column("login", sa.String(length=256), nullable=False),
        sa.Column("name", sa.String(length=256), nullable=False, server_default=""),
        sa.Column("email", sa.String(length=320), nullable=False, server_default=""),
        sa.ForeignKeyConstraint(
            ["project_id"],
            [f"{SCHEMA}.project_folder_access_snapshots.project_id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("project_id", "entry_key", "login"),
        schema=SCHEMA,
    )
    op.create_index(
        "ix_project_folder_access_members_entry",
        "project_folder_access_members",
        ["project_id", "entry_key"],
        schema=SCHEMA,
    )
    op.execute(
        sa.text(
            f"GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE {SCHEMA}.project_folder_access_snapshots TO {RUNTIME_ROLE}"
        )
    )
    op.execute(
        sa.text(
            f"GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE {SCHEMA}.project_folder_access_members TO {RUNTIME_ROLE}"
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            f"REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE {SCHEMA}.project_folder_access_members FROM {RUNTIME_ROLE}"
        )
    )
    op.execute(
        sa.text(
            f"REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE {SCHEMA}.project_folder_access_snapshots FROM {RUNTIME_ROLE}"
        )
    )
    op.drop_index(
        "ix_project_folder_access_members_entry",
        table_name="project_folder_access_members",
        schema=SCHEMA,
    )
    op.drop_table("project_folder_access_members", schema=SCHEMA)
    op.drop_table("project_folder_access_snapshots", schema=SCHEMA)
