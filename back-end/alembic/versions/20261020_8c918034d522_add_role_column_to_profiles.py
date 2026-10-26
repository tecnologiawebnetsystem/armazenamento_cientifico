"""add_role_column_to_profiles

Revision ID: 8c918034d522
Revises: 0001_production_baseline
Create Date: 2026-10-20 16:04:44.716805
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '8c918034d522'
down_revision: Union[str, None] = '0001_production_baseline'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("profiles", sa.Column("role", sa.String(length=40), nullable=False, server_default=""))
    # Preenche role com o valor atual de name (ex: GER -> "gerente")
    op.execute("UPDATE profiles SET role = name")
    # Migração de dados: GER vira "Responsável" no nome de exibição
    op.execute("UPDATE profiles SET name = 'Responsável' WHERE id = 'GER'")


def downgrade() -> None:
    op.execute("UPDATE profiles SET name = role WHERE id = 'GER'")
    op.drop_column("profiles", "role")
