"""Renomeia tabelas legadas removendo o prefixo app_."""

from collections.abc import Sequence

from alembic import op

revision: str = "0002_remove_app_prefix"
down_revision: str | None = "0001_baseline"
branch_labels: Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLES = (
    "groups",
    "user_groups",
    "users",
    "sessions",
    "projects",
    "project_members",
    "project_groups",
    "files",
    "file_shares",
    "file_permissions",
    "activity_logs",
    "access_requests",
    "permission_matrix",
    "settings",
)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = __import__("sqlalchemy").inspect(bind)
    existing = set(inspector.get_table_names())
    for table in TABLES:
        old_name = f"app_{table}"
        if old_name in existing and table not in existing:
            op.rename_table(old_name, table)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = __import__("sqlalchemy").inspect(bind)
    existing = set(inspector.get_table_names())
    for table in reversed(TABLES):
        old_name = f"app_{table}"
        if table in existing and old_name not in existing:
            op.rename_table(table, old_name)
            existing.remove(table)
            existing.add(old_name)
