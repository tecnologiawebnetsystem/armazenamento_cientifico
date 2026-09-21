"""Add data-driven menu permissions and dashboard cards."""
import sqlalchemy as sa

from alembic import op

revision = "0023_parametrizacao_completa"
down_revision = "0022_remove_permission_matrix"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "menu_permissions",
        sa.Column("menu_id", sa.String(80), sa.ForeignKey("menus.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("permission_id", sa.String(80), sa.ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("allowed", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_table(
        "dashboard_cards",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("module_id", sa.String(80), sa.ForeignKey("modules.id", ondelete="SET NULL")),
        sa.Column("key", sa.String(80), nullable=False, unique=True),
        sa.Column("title", sa.String(140), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("metric_key", sa.String(80), nullable=False),
        sa.Column("route", sa.String(180), nullable=False, server_default=""),
        sa.Column("profile_ids", sa.Text(), nullable=False, server_default=""),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_index("ix_dashboard_cards_module_id", "dashboard_cards", ["module_id"])


def downgrade() -> None:
    op.drop_index("ix_dashboard_cards_module_id", table_name="dashboard_cards")
    op.drop_table("dashboard_cards")
    op.drop_table("menu_permissions")
