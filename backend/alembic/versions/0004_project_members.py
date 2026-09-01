"""Cria a relação persistida de membros por projeto."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0004_project_members"
down_revision: str | None = "0003_add_perfis"
branch_labels: Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "project_members" not in inspector.get_table_names():
        op.create_table(
            "project_members",
            sa.Column("project_id", sa.String(36), nullable=False),
            sa.Column("user_id", sa.String(36), nullable=False),
            sa.Column("papel", sa.String(40), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("project_id", "user_id"),
        )
        op.create_index("ix_project_members_user_id", "project_members", ["user_id"])


def downgrade() -> None:
    if "project_members" in sa.inspect(op.get_bind()).get_table_names():
        op.drop_index("ix_project_members_user_id", table_name="project_members")
        op.drop_table("project_members")
