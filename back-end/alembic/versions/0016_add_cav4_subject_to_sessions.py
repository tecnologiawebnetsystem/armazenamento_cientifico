"""Store the authenticated CAV4 subject on the SIGAC session only."""
from alembic import op
import sqlalchemy as sa

revision = "0016_add_cav4_subject_to_sessions"
down_revision = "0015_remove_orphan_app_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("sessions", sa.Column("cav4_subject", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("sessions", "cav4_subject")
