"""Adiciona FKs ausentes ao modelo relacional existente."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0005_integridade_relacional"
down_revision: str | None = "0004_project_members"
branch_labels: Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _has_table(name: str) -> bool:
    return name in sa.inspect(op.get_bind()).get_table_names()


def upgrade() -> None:
    if _has_table("users"):
        with op.batch_alter_table("users") as batch:
            batch.create_foreign_key("fk_users_perfil_id_perfis", "perfis", ["perfil_id"], ["id"], ondelete="SET NULL")
    if _has_table("permissoes"):
        with op.batch_alter_table("permissoes") as batch:
            batch.create_foreign_key("fk_permissoes_modulo_id_modulos", "modulos", ["modulo_id"], ["id"], ondelete="CASCADE")
    if _has_table("files"):
        with op.batch_alter_table("files") as batch:
            batch.create_foreign_key("fk_files_parent_id_files", "files", ["parent_id"], ["id"], ondelete="CASCADE")
            batch.create_foreign_key("fk_files_created_by_users", "users", ["created_by"], ["id"], ondelete="RESTRICT")
    if _has_table("activity_logs"):
        with op.batch_alter_table("activity_logs") as batch:
            batch.create_foreign_key("fk_activity_logs_user_id_users", "users", ["user_id"], ["id"], ondelete="RESTRICT")


def downgrade() -> None:
    if _has_table("activity_logs"):
        with op.batch_alter_table("activity_logs") as batch:
            batch.drop_constraint("fk_activity_logs_user_id_users", type_="foreignkey")
    if _has_table("files"):
        with op.batch_alter_table("files") as batch:
            batch.drop_constraint("fk_files_created_by_users", type_="foreignkey")
            batch.drop_constraint("fk_files_parent_id_files", type_="foreignkey")
    if _has_table("permissoes"):
        with op.batch_alter_table("permissoes") as batch:
            batch.drop_constraint("fk_permissoes_modulo_id_modulos", type_="foreignkey")
    if _has_table("users"):
        with op.batch_alter_table("users") as batch:
            batch.drop_constraint("fk_users_perfil_id_perfis", type_="foreignkey")
