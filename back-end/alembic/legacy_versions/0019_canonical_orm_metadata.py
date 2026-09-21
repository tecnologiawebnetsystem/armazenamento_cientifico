"""Registra o schema ORM canônico exclusivamente no histórico PostgreSQL."""

from collections.abc import Sequence

revision: str = "0019_canonical_orm_metadata"
down_revision: str | None = "0018_remove_legacy_schema"
branch_labels: Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # A versão 0018 conclui a consolidação física. Esta revisão é o ponto
    # canônico do metadata ORM atual; alterações futuras devem ser autogeradas.
    pass


def downgrade() -> None:
    pass
