"""Remove tabelas app_* legadas sem consumidores no frontend ou backend."""

from collections.abc import Sequence

from alembic import op

revision: str = "0015_remove_orphan_app_tables"
down_revision: str | None = "0014_remove_unused_file_access"
branch_labels: Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


ORPHAN_TABLES = (
    "app_access_requests",
    "app_activity_logs",
    "app_file_shares",
    "app_files",
    "app_permissions",
    "app_project_members",
    "app_projects",
    "app_report_snapshots",
    "app_sessions",
    "app_settings",
    "app_users",
)


def upgrade() -> None:
    for table in ORPHAN_TABLES:
        op.execute(f'DROP TABLE IF EXISTS "{table}" CASCADE')


def downgrade() -> None:
    raise RuntimeError("A remoção das tabelas legadas é irreversível")
