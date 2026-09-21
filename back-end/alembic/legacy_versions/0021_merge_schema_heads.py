"""Unifica os ramos históricos do schema SIGAC."""
from collections.abc import Sequence

revision: str = "0021_merge_schema_heads"
down_revision: tuple[str, ...] = (
    "0016_add_cav4_subject_to_sessions",
    "0019_align_orm_columns",
    "0020_restore_auth_sessions",
)
branch_labels: Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
