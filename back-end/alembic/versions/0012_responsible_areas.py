"""Cria o catálogo de áreas responsáveis e suas sequências de códigos."""

from alembic import op
import sqlalchemy as sa

revision = "0012_responsible_areas"
down_revision = "0011_bootstrap_orm_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "responsible_areas",
        sa.Column("id", sa.String(length=40), primary_key=True),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("prefix", sa.String(length=20), nullable=False),
        sa.Column("next_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("name"),
        sa.UniqueConstraint("prefix"),
    )
    op.create_index("ix_responsible_areas_name", "responsible_areas", ["name"])
    op.create_index("ix_responsible_areas_active", "responsible_areas", ["active"])


def downgrade() -> None:
    op.drop_index("ix_responsible_areas_active", table_name="responsible_areas")
    op.drop_index("ix_responsible_areas_name", table_name="responsible_areas")
    op.drop_table("responsible_areas")
