"""add project association to activity logs

The ORM already exposes ``ActivityLog.project_id`` and dashboard queries
select it. This migration repairs databases created before that column was
added to the activity log table.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c4a7e1b2d9f0"
down_revision: str | None = "9c3ceb9c9272"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "ALTER TABLE activity_logs "
            "ADD COLUMN IF NOT EXISTS project_id VARCHAR(36)"
        )
    )
    bind.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_activity_logs_project_id "
            "ON activity_logs (project_id)"
        )
    )
    bind.execute(
        sa.text(
            "DO $$ BEGIN "
            "ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_project_id_fkey "
            "FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL; "
            "EXCEPTION WHEN duplicate_object THEN NULL; END $$"
        )
    )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "ALTER TABLE activity_logs "
            "DROP CONSTRAINT IF EXISTS activity_logs_project_id_fkey"
        )
    )
    bind.execute(
        sa.text("DROP INDEX IF EXISTS ix_activity_logs_project_id")
    )
    bind.execute(
        sa.text("ALTER TABLE activity_logs DROP COLUMN IF EXISTS project_id")
    )
