"""Add configurable report fields.

Revision ID: 0010_report_fields
Revises: 0009_add_user_last_login_at
"""

import sqlalchemy as sa

from alembic import op

revision = "0010_report_fields"
down_revision = "0009_add_user_last_login_at"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = inspector.get_table_names()

    # The bootstrap SQL schema may have created this table before Alembic ran.
    if "report_fields" not in table_names:
        op.create_table(
            "report_fields",
            sa.Column("id", sa.String(60), primary_key=True),
            sa.Column("report_code", sa.String(60), nullable=False),
            sa.Column("field_key", sa.String(100), nullable=False),
            sa.Column("label", sa.String(160), nullable=False),
            sa.Column("source_key", sa.String(160), nullable=False),
            sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.UniqueConstraint("report_code", "field_key", name="uq_report_fields_code_key"),
        )

    index_names = {index["name"] for index in inspector.get_indexes("report_fields")}
    if "ix_report_fields_report_code" not in index_names:
        op.create_index("ix_report_fields_report_code", "report_fields", ["report_code"])


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "report_fields" not in inspector.get_table_names():
        return

    index_names = {index["name"] for index in inspector.get_indexes("report_fields")}
    if "ix_report_fields_report_code" in index_names:
        op.drop_index("ix_report_fields_report_code", table_name="report_fields")
    op.drop_table("report_fields")
