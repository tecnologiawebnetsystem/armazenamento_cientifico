"""Remove tabelas legadas após a consolidação do schema canônico."""

from collections.abc import Sequence

from sqlalchemy import inspect

from alembic import op

revision: str = "0018_remove_legacy_schema"
down_revision: str | None = "0017_align_canonical_schema"
branch_labels: Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    tables = set(inspect(bind).get_table_names())

    if "files" in tables and "folders" in tables:
        op.execute(
            "INSERT INTO folders (id, project_id, parent_id, kind, name, size_bytes, mime_type, created_by, created_at, updated_at) "
            "SELECT id, project_id, parent_id, CASE WHEN kind = 'folder' THEN 'pasta' ELSE kind END, name, size_bytes, mime_type, created_by, created_at, updated_at "
            "FROM files WHERE kind IN ('folder', 'pasta') AND NOT EXISTS (SELECT 1 FROM folders f WHERE f.id = files.id)"
        )
        op.drop_table("files")
    elif "files" in tables and "folders" not in tables:
        op.rename_table("files", "folders")

    for table in (
        "perfis",
        "modulos",
        "permissoes",
        "perfil_permissoes",
        "perfil_modulos",
        "status_projetos",
        "tipos_projetos",
        "tipos_relatorios",
        "configuracoes_sistema",
    ):
        if table in tables:
            op.drop_table(table)


def downgrade() -> None:
    pass
