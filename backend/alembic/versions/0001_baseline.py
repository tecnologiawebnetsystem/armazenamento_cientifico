"""Registra o schema legado como baseline do Alembic.

Esta migration não cria tabelas: o schema inicial existente é aplicado pelo
Docker/SQL legado. A partir deste ponto, alterações devem ser feitas em novas
revisions geradas com `alembic revision --autogenerate`.
"""
from typing import Sequence, Union

revision: str = "0001_baseline"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
