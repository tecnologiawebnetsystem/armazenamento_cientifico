"""Remove estruturas de compartilhamento e permissões de arquivos descontinuadas."""

from collections.abc import Sequence

from alembic import op

revision: str = "0014_remove_unused_file_access"
down_revision: str | None = "0013_schema_cleanup"
branch_labels: Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    for table in ("file_permissions", "file_shares", "group_members", "groups", "notifications"):
        op.execute(f'DROP TABLE IF EXISTS "{table}" CASCADE')


def downgrade() -> None:
    raise RuntimeError("A remoção das tabelas descontinuadas é irreversível")
