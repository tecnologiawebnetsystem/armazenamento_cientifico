"""Alinha colunas usadas pelo ORM e pelos repositories."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0019_align_orm_columns"
down_revision: str | None = "0018_remove_legacy_schema"
branch_labels: Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _add(table: str, column: sa.Column) -> None:
    inspector = sa.inspect(op.get_bind())
    if table in inspector.get_table_names() and column.name not in {item["name"] for item in inspector.get_columns(table)}:
        op.add_column(table, column)


def upgrade() -> None:
    _add("access_requests", sa.Column("request_type", sa.String(40), nullable=False, server_default="geral"))
    _add("access_requests", sa.Column("requested_role", sa.String(40), nullable=False, server_default=""))
    _add("access_requests", sa.Column("justification", sa.String(2000), nullable=False, server_default=""))
    _add("access_requests", sa.Column("servicenow_ticket", sa.String(120), nullable=True))
    _add("access_requests", sa.Column("updated_at", sa.DateTime(), nullable=True))
    _add("access_requests", sa.Column("analyzed_by", sa.String(36), nullable=True))
    _add("activity_logs", sa.Column("result", sa.String(30), nullable=False, server_default="success"))
    _add("activity_logs", sa.Column("project_id", sa.String(36), nullable=True))
    _add("permission_matrix", sa.Column("role", sa.String(40), nullable=True))
    _add("permission_matrix", sa.Column("can_view_projects", sa.Boolean(), nullable=False, server_default=sa.true()))
    _add("permission_matrix", sa.Column("can_create_projects", sa.Boolean(), nullable=False, server_default=sa.false()))
    _add("permission_matrix", sa.Column("can_edit_projects", sa.Boolean(), nullable=False, server_default=sa.false()))
    _add("permission_matrix", sa.Column("can_delete_projects", sa.Boolean(), nullable=False, server_default=sa.false()))
    _add("permission_matrix", sa.Column("can_manage_members", sa.Boolean(), nullable=False, server_default=sa.false()))
    _add("permission_matrix", sa.Column("can_upload_files", sa.Boolean(), nullable=False, server_default=sa.false()))
    _add("permission_matrix", sa.Column("can_delete_files", sa.Boolean(), nullable=False, server_default=sa.false()))
    _add("permission_matrix", sa.Column("can_approve_requests", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    pass
