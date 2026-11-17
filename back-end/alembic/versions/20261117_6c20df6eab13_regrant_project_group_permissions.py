"""Reapply runtime permissions for project access principals.

Revision ID: 6c20df6eab13
Revises: f41a08b790a1
Create Date: 2026-11-17
"""
from collections.abc import Sequence

from alembic import op

revision: str = "6c20df6eab13"
down_revision: str | None = "f41a08b790a1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SCHEMA = "a25034"
RUNTIME_ROLE = "a25034d_aplicacao"


def _quoted_identifiers() -> tuple[str, str]:
    preparer = op.get_context().dialect.identifier_preparer
    return preparer.quote(SCHEMA), preparer.quote(RUNTIME_ROLE)


def upgrade() -> None:
    schema, runtime_role = _quoted_identifiers()
    op.execute(f"GRANT USAGE ON SCHEMA {schema} TO {runtime_role}")
    op.execute(
        f"GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "
        f"{schema}.project_groups TO {runtime_role}"
    )
    op.execute(
        f"GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "
        f"{schema}.project_access_groups TO {runtime_role}"
    )


def downgrade() -> None:
    schema, runtime_role = _quoted_identifiers()
    op.execute(
        f"REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE "
        f"{schema}.project_groups FROM {runtime_role}"
    )
    op.execute(
        f"REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE "
        f"{schema}.project_access_groups FROM {runtime_role}"
    )
    op.execute(f"REVOKE USAGE ON SCHEMA {schema} FROM {runtime_role}")
