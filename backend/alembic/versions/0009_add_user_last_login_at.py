"""Add last login timestamp to users.

Revision ID: 0009_add_user_last_login_at
Revises: 0008_add_user_avatar_url
"""
from alembic import op
import sqlalchemy as sa


revision = "0009_add_user_last_login_at"
down_revision = "0008_add_user_avatar_url"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("users")}
    if "last_login_at" not in columns:
        op.add_column("users", sa.Column("last_login_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("users")}
    if "last_login_at" in columns:
        op.drop_column("users", "last_login_at")
