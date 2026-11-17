"""grant runtime access to project_access_groups

Revision ID: b814c0ad62ef
Revises: fcb6e012eb9f
Create Date: 2026-11-17
"""
from collections.abc import Sequence

from alembic import op

revision: str = "b814c0ad62ef"
down_revision: str | None = "fcb6e012eb9f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


SCHEMA_NAME = "a25034"
RUNTIME_ROLE = "a25034d_aplicacao"


def _quoted_identifiers() -> tuple[str, str]:
    preparer = op.get_context().dialect.identifier_preparer
    return preparer.quote(SCHEMA_NAME), preparer.quote(RUNTIME_ROLE)


def upgrade() -> None:
    schema_name, runtime_role = _quoted_identifiers()
    op.execute(
        f"GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "
        f"{schema_name}.project_access_groups TO {runtime_role}"
    )


def downgrade() -> None:
    schema_name, runtime_role = _quoted_identifiers()
    op.execute(
        f"REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE "
        f"{schema_name}.project_access_groups FROM {runtime_role}"
    )
