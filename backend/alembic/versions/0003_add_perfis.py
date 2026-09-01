"""Cria perfis e vínculo perfil_id nos usuários."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0003_add_perfis"
down_revision: str | None = "0002_remove_app_prefix"
branch_labels: Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "perfis" not in tables:
        op.create_table(
            "perfis",
            sa.Column("id", sa.String(20), primary_key=True),
            sa.Column("nome", sa.String(80), nullable=False, unique=True),
            sa.Column("descricao", sa.String(255), nullable=False, server_default=""),
            sa.Column("criado_em", sa.DateTime(), nullable=False),
        )

    user_columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("users")}
    if "perfil_id" not in user_columns:
        with op.batch_alter_table("users", recreate="always") as batch_op:
            batch_op.add_column(sa.Column("perfil_id", sa.String(20), nullable=True))
            batch_op.create_foreign_key("fk_users_perfil_id", "perfis", ["perfil_id"], ["id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "users" in inspector.get_table_names():
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        if "perfil_id" in user_columns:
            with op.batch_alter_table("users", recreate="always") as batch_op:
                foreign_keys = inspector.get_foreign_keys("users")
                constraint = next((fk["name"] for fk in foreign_keys if "perfil_id" in fk.get("constrained_columns", [])), None)
                if constraint:
                    batch_op.drop_constraint(constraint, type_="foreignkey")
                batch_op.drop_column("perfil_id")
    if "perfis" in sa.inspect(op.get_bind()).get_table_names():
        op.drop_table("perfis")
