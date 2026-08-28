"""Cria perfis e vínculo perfil_id nos usuários."""

from collections.abc import Sequence
from alembic import op
import sqlalchemy as sa

revision: str = "0003_add_perfis"
down_revision: str | None = "0002_remove_app_prefix"
branch_labels: Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "perfis",
        sa.Column("id", sa.String(20), primary_key=True),
        sa.Column("nome", sa.String(80), nullable=False, unique=True),
        sa.Column("descricao", sa.String(255), nullable=False, server_default=""),
        sa.Column("criado_em", sa.DateTime(), nullable=False),
    )
    op.add_column("users", sa.Column("perfil_id", sa.String(20), nullable=True))
    op.create_foreign_key("fk_users_perfil_id", "users", "perfis", ["perfil_id"], ["id"])


def downgrade() -> None:
    op.drop_constraint("fk_users_perfil_id", "users", type_="foreignkey")
    op.drop_column("users", "perfil_id")
    op.drop_table("perfis")
