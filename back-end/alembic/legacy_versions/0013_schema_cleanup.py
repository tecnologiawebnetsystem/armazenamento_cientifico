"""Consolida tabelas de acesso não utilizadas sem remover dados existentes.

As estruturas opcionais abaixo foram criadas por versões experimentais e não são
referenciadas pela API atual. A migration somente as remove quando estão vazias;
se houver qualquer registro, preserva a tabela e registra a decisão no log.
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision = "0013_schema_cleanup"
down_revision = "0012_responsible_areas"
branch_labels: Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

OPTIONAL_UNUSED_TABLES = (
    "project_groups",
    "user_groups",
    "groups",
    "project_access_groups",
    "project_access_roles",
)


def _drop_empty_tables() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    for table in OPTIONAL_UNUSED_TABLES:
        if table not in tables:
            continue
        if bind.execute(sa.text(f"SELECT COUNT(*) FROM {table}")).scalar_one() == 0:
            op.drop_table(table)


def upgrade() -> None:
    _drop_empty_tables()


def downgrade() -> None:
    # Não recria tabelas removidas automaticamente: não há como recuperar
    # constraints e dados sem um backup da instalação original.
    pass
