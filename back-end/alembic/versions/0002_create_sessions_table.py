"""create sessions table

Gerada por ``alembic revision --autogenerate`` a partir do model
``app.modules.auth.models.UserSession``. A tabela ``sessions`` já era usada
via SQL cru em produção antes desta revisão (login local e CAV4); a checagem
de existência evita falha caso ela já exista fora do controle do Alembic.

Revision ID: 0002_create_sessions_table
Revises: 0001_production_baseline
Create Date: 2026-09-22 11:10:30.603240
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002_create_sessions_table"
down_revision: str | None = "0001_production_baseline"
branch_labels: Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    if "sessions" in sa.inspect(bind).get_table_names():
        return
    op.create_table(
        "sessions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("cav4_subject", sa.String(length=320), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_sessions_user_id", "sessions", ["user_id"])


def downgrade() -> None:
    bind = op.get_bind()
    if "sessions" in sa.inspect(bind).get_table_names():
        op.drop_index("ix_sessions_user_id", table_name="sessions")
        op.drop_table("sessions")
