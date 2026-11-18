"""grant runtime delete access to project-owned records

Revision ID: 9d2c4a71e6f3
Revises: 6c20df6eab13
Create Date: 2026-11-18
"""
from collections.abc import Sequence

from alembic import op

revision: str = "9d2c4a71e6f3"
down_revision: str | None = "6c20df6eab13"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SCHEMA = "a25034"
RUNTIME_ROLE = "a25034d_aplicacao"


def _quoted_identifiers() -> tuple[str, str]:
    preparer = op.get_context().dialect.identifier_preparer
    return preparer.quote(SCHEMA), preparer.quote(RUNTIME_ROLE)


def upgrade() -> None:
    schema, runtime_role = _quoted_identifiers()
    for table_name in ("project_members", "folders"):
        table = op.get_context().dialect.identifier_preparer.quote(table_name)
        op.execute(f"GRANT DELETE ON TABLE {schema}.{table} TO {runtime_role}")


def downgrade() -> None:
    schema, runtime_role = _quoted_identifiers()
    for table_name in ("project_members", "folders"):
        table = op.get_context().dialect.identifier_preparer.quote(table_name)
        op.execute(f"REVOKE DELETE ON TABLE {schema}.{table} FROM {runtime_role}")
