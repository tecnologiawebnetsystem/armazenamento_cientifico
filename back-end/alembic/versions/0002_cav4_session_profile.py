"""Store transient CAV4 profile data on sessions, not users."""
from alembic import op
import sqlalchemy as sa

revision = "0002_cav4_session_profile"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("sessions", sa.Column("profile_data", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("sessions", "profile_data")
