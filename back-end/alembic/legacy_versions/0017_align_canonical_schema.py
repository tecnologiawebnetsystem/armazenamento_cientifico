"""Alinha perfis e remove tabelas sem consumidores ativos."""

from collections.abc import Sequence

from sqlalchemy import inspect

from alembic import op

revision: str = "0017_align_canonical_schema"
down_revision: str | None = "0016_rename_files_to_folders"
branch_labels: Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    tables = set(inspect(bind).get_table_names())

    if "profolders" in tables and "profiles" not in tables:
        op.rename_table("profolders", "profiles")
        tables.remove("profolders")
        tables.add("profiles")

    if "sessions" in tables:
        op.drop_table("sessions")

    if "folders" in tables:
        op.execute("DELETE FROM folders WHERE kind NOT IN ('pasta', 'folder')")
        op.execute("UPDATE folders SET kind = 'pasta' WHERE kind = 'folder'")


def downgrade() -> None:
    # A remoção de tabelas sem consumidores não é revertida automaticamente.
    pass
