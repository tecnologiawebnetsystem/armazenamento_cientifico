"""remove system settings table

Generated with ``alembic revision --autogenerate`` after removing the
SystemSetting model. The existence check supports both existing databases,
which still contain the legacy table, and new databases built from baseline.
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "9c3ceb9c9272"
down_revision: str | None = "fb09d5c2e802"
branch_labels: Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    if "system_settings" in sa.inspect(op.get_bind()).get_table_names():
        op.drop_table("system_settings")


def downgrade() -> None:
    if "system_settings" not in sa.inspect(op.get_bind()).get_table_names():
        op.create_table(
            "system_settings",
            sa.Column("key", sa.String(length=120), nullable=False),
            sa.Column("value", sa.Text(), nullable=False),
            sa.Column("value_type", sa.String(length=30), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("group_name", sa.String(length=80), nullable=False),
            sa.Column("active", sa.Boolean(), nullable=False),
            sa.PrimaryKeyConstraint("key"),
        )
