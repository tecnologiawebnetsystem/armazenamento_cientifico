"""Add avatar URL to users.

Revision ID: 0008_add_user_avatar_url
Revises: 0007_add_solicitante_role
"""
import sqlalchemy as sa

from alembic import op

revision = "0008_add_user_avatar_url"
down_revision = "0007_add_solicitante_role"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("users")}
    if "avatar_url" not in columns:
        op.add_column("users", sa.Column("avatar_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("users")}
    if "avatar_url" in columns:
        op.drop_column("users", "avatar_url")
