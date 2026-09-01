"""Add solicitante profile.

Revision ID: 0007_add_solicitante_role
Revises: 0006_compatibilidade_relacional
"""
import sqlalchemy as sa

from alembic import op

revision = "0007_add_solicitante_role"
down_revision = "0006_compatibilidade_relacional"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "perfis" in inspector.get_table_names():
        op.execute(sa.text("INSERT INTO perfis (id, nome, descricao, criado_em) SELECT 'SOL', 'solicitante', 'Solicitação e acompanhamento de acessos', CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM perfis WHERE id = 'SOL')"))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "perfis" in inspector.get_table_names():
        op.execute(sa.text("DELETE FROM perfis WHERE id = 'SOL' AND nome = 'solicitante'"))
