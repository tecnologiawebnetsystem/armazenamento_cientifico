"""Adiciona metadados de requisição aos eventos de auditoria."""

from collections.abc import Sequence
import sqlalchemy as sa
from alembic import op

revision: str = "0002_audit_request_metadata"
down_revision: str | None = "0001_production_baseline"
branch_labels: Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Os metadados passaram a fazer parte da baseline 0001.
    # Esta revisão é mantida como compatibilidade para bancos que já aplicaram 0001.
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("activity_logs")}
    for name, column in (
        ("correlation_id", sa.Column("correlation_id", sa.String(length=36), nullable=True)),
        ("http_method", sa.Column("http_method", sa.String(length=10), nullable=True)),
        ("route", sa.Column("route", sa.String(length=255), nullable=True)),
        ("duration_ms", sa.Column("duration_ms", sa.Float(), nullable=True)),
        ("ip_address", sa.Column("ip_address", sa.String(length=64), nullable=True)),
    ):
        if name not in columns:
            op.add_column("activity_logs", column)
    indexes = {index["name"] for index in inspector.get_indexes("activity_logs")}
    if "ix_activity_logs_correlation_id" not in indexes:
        op.create_index("ix_activity_logs_correlation_id", "activity_logs", ["correlation_id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    indexes = {index["name"] for index in inspector.get_indexes("activity_logs")}
    if "ix_activity_logs_correlation_id" in indexes:
        op.drop_index("ix_activity_logs_correlation_id", table_name="activity_logs")
    columns = {column["name"] for column in inspector.get_columns("activity_logs")}
    for name in ("ip_address", "duration_ms", "route", "http_method", "correlation_id"):
        if name in columns:
            op.drop_column("activity_logs", name)
