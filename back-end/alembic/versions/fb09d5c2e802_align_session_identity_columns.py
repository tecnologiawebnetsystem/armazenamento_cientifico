"""align session identity columns

Generated with ``alembic revision --autogenerate`` from UserSession.
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "fb09d5c2e802"
down_revision: str | None = "0002_create_sessions_table"
branch_labels: Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("sessions", sa.Column("email", sa.String(length=320), nullable=True))
    op.add_column("sessions", sa.Column("display_name", sa.String(length=200), nullable=True))
    op.add_column("sessions", sa.Column("profile_id", sa.String(length=20), nullable=True))
    op.create_index("ix_sessions_email", "sessions", ["email"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_sessions_email", table_name="sessions")
    op.drop_column("sessions", "profile_id")
    op.drop_column("sessions", "display_name")
    op.drop_column("sessions", "email")

