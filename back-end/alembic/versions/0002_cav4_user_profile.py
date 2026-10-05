"""Store CAV4 profile attributes on users.

Revision ID: 0002_cav4_user_profile
Revises: 0001_initial_schema
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_cav4_user_profile"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("email", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("display_name", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("job_title", sa.String(length=160), nullable=True))
    op.add_column("users", sa.Column("area", sa.String(length=160), nullable=True))
    op.add_column("users", sa.Column("avatar_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "avatar_url")
    op.drop_column("users", "area")
    op.drop_column("users", "job_title")
    op.drop_column("users", "display_name")
    op.drop_column("users", "email")
