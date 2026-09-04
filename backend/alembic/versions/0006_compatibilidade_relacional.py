"""Cria tabelas auxiliares usadas pelos endpoints com integridade referencial."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0006_compatibilidade_relacional"
down_revision: str | None = "0005_integridade_relacional"
branch_labels: Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "sessions" not in tables and "users" in tables:
        op.create_table(
            "sessions",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
        )
        op.create_index("ix_sessions_user_id", "sessions", ["user_id"])

    if "access_requests" not in tables and {"projects", "users"}.issubset(tables):
        op.create_table(
            "access_requests",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("project_id", sa.String(36), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=True),
            sa.Column("requester_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
            sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
        op.create_index("ix_access_requests_project_id", "access_requests", ["project_id"])
        op.create_index("ix_access_requests_requester_id", "access_requests", ["requester_id"])

    if "permission_matrix" not in tables:
        op.create_table(
            "permission_matrix",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("matrix", sa.Text(), nullable=False),
        )

    if "settings" not in tables:
        op.create_table(
            "settings",
            sa.Column("key", sa.String(100), primary_key=True),
            sa.Column("value", sa.Text(), nullable=False),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    for table in ("settings", "permission_matrix", "access_requests", "sessions"):
        if table in tables:
            op.drop_table(table)
