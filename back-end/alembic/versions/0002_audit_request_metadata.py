"""Adiciona metadados de requisição aos eventos de auditoria."""

from collections.abc import Sequence
import sqlalchemy as sa
from alembic import op

revision: str = "0002_audit_request_metadata"
down_revision: str | None = "0001_production_baseline"
branch_labels: Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("activity_logs", sa.Column("correlation_id", sa.String(length=36), nullable=True))
    op.add_column("activity_logs", sa.Column("http_method", sa.String(length=10), nullable=True))
    op.add_column("activity_logs", sa.Column("route", sa.String(length=255), nullable=True))
    op.add_column("activity_logs", sa.Column("duration_ms", sa.Float(), nullable=True))
    op.add_column("activity_logs", sa.Column("ip_address", sa.String(length=64), nullable=True))
    op.create_index("ix_activity_logs_correlation_id", "activity_logs", ["correlation_id"])


def downgrade() -> None:
    op.drop_index("ix_activity_logs_correlation_id", table_name="activity_logs")
    for column in ("ip_address", "duration_ms", "route", "http_method", "correlation_id"):
        op.drop_column("activity_logs", column)
