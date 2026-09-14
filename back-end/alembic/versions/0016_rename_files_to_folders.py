"""Renomeia files para folders e remove registros que não são pastas."""

from collections.abc import Sequence

from alembic import op

revision: str = "0016_rename_files_to_folders"
down_revision: str | None = "0015_remove_orphan_app_tables"
branch_labels: Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = __import__("sqlalchemy").inspect(bind)
    tables = inspector.get_table_names()

    if "files" in tables and "folders" not in tables:
        op.rename_table("files", "folders")
        tables = ["folders" if table == "files" else table for table in tables]

    if "folders" in tables:
        op.execute("DELETE FROM folders WHERE kind NOT IN ('pasta', 'folder')")
        op.execute("UPDATE folders SET kind = 'pasta' WHERE kind = 'folder'")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = __import__("sqlalchemy").inspect(bind)
    if "folders" in inspector.get_table_names() and "files" not in inspector.get_table_names():
        op.rename_table("folders", "files")
