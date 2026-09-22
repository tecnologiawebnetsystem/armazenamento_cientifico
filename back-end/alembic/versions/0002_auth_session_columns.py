"""Completa as colunas usadas pelas sessões corporativas."""

from collections.abc import Sequence

from sqlalchemy import text

from alembic import op

revision: str = "0002_auth_session_columns"
down_revision: str | None = "0001_production_baseline"
branch_labels: Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(text("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS email VARCHAR(320)"))
    bind.execute(text("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS profile_id VARCHAR(20)"))
    bind.execute(text("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP"))
    bind.execute(text("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cav4_subject VARCHAR(255)"))
    bind.execute(text("CREATE INDEX IF NOT EXISTS ix_sessions_email ON sessions(email)"))
    bind.execute(text("CREATE INDEX IF NOT EXISTS ix_sessions_profile_id ON sessions(profile_id)"))
    bind.execute(text("CREATE INDEX IF NOT EXISTS ix_sessions_expires_at ON sessions(expires_at)"))


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(text("DROP INDEX IF EXISTS ix_sessions_expires_at"))
    bind.execute(text("DROP INDEX IF EXISTS ix_sessions_profile_id"))
    bind.execute(text("DROP INDEX IF EXISTS ix_sessions_email"))
    bind.execute(text("ALTER TABLE sessions DROP COLUMN IF EXISTS cav4_subject"))
    bind.execute(text("ALTER TABLE sessions DROP COLUMN IF EXISTS expires_at"))
    bind.execute(text("ALTER TABLE sessions DROP COLUMN IF EXISTS profile_id"))
    bind.execute(text("ALTER TABLE sessions DROP COLUMN IF EXISTS email"))
