"""Move principals to a global catalog and keep project data on associations.

Revision ID: 6dc4f318c2aa
Revises: f41a08b790a1
Create Date: 2026-11-17
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "6dc4f318c2aa"
down_revision: str | None = "f41a08b790a1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SCHEMA = "a25034"
RUNTIME_ROLE = '"a25034d_aplicacao"'


def upgrade() -> None:
    op.create_table(
        "project_groups_global",
        sa.Column("group_id", sa.String(36), nullable=False),
        sa.Column("identifier", sa.String(256), nullable=False),
        sa.Column("group_name", sa.String(256), nullable=False),
        sa.Column("principal_type", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("principal_type IN ('group', 'role')", name="ck_project_groups_principal_type"),
        sa.PrimaryKeyConstraint("group_id"),
        schema=SCHEMA,
    )
    op.create_index(
        "uq_project_groups_type_identifier_ci",
        "project_groups_global",
        ["principal_type", sa.text("lower(identifier)")],
        unique=True,
        schema=SCHEMA,
    )
    op.execute(sa.text(f"""
        INSERT INTO {SCHEMA}.project_groups_global
            (group_id, identifier, group_name, principal_type, created_at, updated_at)
        SELECT DISTINCT ON (principal_type, lower(identifier))
            group_id, identifier, group_name, principal_type, created_at, updated_at
        FROM {SCHEMA}.project_groups
        ORDER BY principal_type, lower(identifier), group_id
    """))

    op.add_column("project_access_groups", sa.Column("catalog_group_id", sa.String(36), nullable=True), schema=SCHEMA)
    op.add_column("project_access_groups", sa.Column("access_level", sa.String(40), nullable=True), schema=SCHEMA)
    op.add_column("project_access_groups", sa.Column("source", sa.String(20), nullable=True), schema=SCHEMA)
    op.add_column("project_access_groups", sa.Column("created_at", sa.DateTime(timezone=True), nullable=True), schema=SCHEMA)
    op.add_column("project_access_groups", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True), schema=SCHEMA)
    op.execute(sa.text(f"""
        UPDATE {SCHEMA}.project_access_groups AS link
        SET catalog_group_id = global_group.group_id,
            access_level = scoped_group.access_level,
            source = scoped_group.source,
            created_at = scoped_group.created_at,
            updated_at = scoped_group.updated_at
        FROM {SCHEMA}.project_groups AS scoped_group
        JOIN {SCHEMA}.project_groups_global AS global_group
          ON global_group.principal_type = scoped_group.principal_type
         AND lower(global_group.identifier) = lower(scoped_group.identifier)
        WHERE link.group_id = scoped_group.group_id
    """))
    op.drop_index("ix_project_access_groups_access_level", table_name="project_access_groups", schema=SCHEMA)
    op.drop_index("ix_project_access_groups_project_id", table_name="project_access_groups", schema=SCHEMA)
    op.execute(sa.text(f"""
        ALTER TABLE {SCHEMA}.project_access_groups
            DROP CONSTRAINT fk_project_access_groups_project_group,
            DROP CONSTRAINT project_access_groups_pkey,
            DROP COLUMN group_id,
            RENAME COLUMN catalog_group_id TO group_id,
            ALTER COLUMN group_id SET NOT NULL,
            ALTER COLUMN access_level SET NOT NULL,
            ALTER COLUMN source SET NOT NULL,
            ALTER COLUMN created_at SET NOT NULL,
            ALTER COLUMN updated_at SET NOT NULL,
            ADD CONSTRAINT project_access_groups_pkey PRIMARY KEY (project_id, group_id),
            ADD CONSTRAINT fk_project_access_groups_group
                FOREIGN KEY (group_id) REFERENCES {SCHEMA}.project_groups_global(group_id) ON DELETE RESTRICT,
            ADD CONSTRAINT ck_project_access_groups_access_level
                CHECK (access_level IN ('leitura', 'escrita', 'administrador'))
    """))
    op.drop_table("project_groups", schema=SCHEMA)
    op.rename_table("project_groups_global", "project_groups", schema=SCHEMA)
    op.create_index("ix_project_groups_identifier", "project_groups", ["identifier"], schema=SCHEMA)
    op.create_index("ix_project_groups_principal_type", "project_groups", ["principal_type"], schema=SCHEMA)
    op.create_index("ix_project_access_groups_access_level", "project_access_groups", ["access_level"], schema=SCHEMA)
    op.execute(sa.text(
        f"GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE {SCHEMA}.project_groups TO {RUNTIME_ROLE}"
    ))


def downgrade() -> None:
    op.create_table(
        "project_groups_scoped",
        sa.Column("group_id", sa.String(36), nullable=False),
        sa.Column("project_id", sa.String(36), nullable=False),
        sa.Column("identifier", sa.String(256), nullable=False),
        sa.Column("group_name", sa.String(256), nullable=False),
        sa.Column("principal_type", sa.String(20), nullable=False),
        sa.Column("access_level", sa.String(40), nullable=False),
        sa.Column("source", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("principal_type IN ('group', 'role')", name="ck_project_groups_principal_type"),
        sa.CheckConstraint("access_level IN ('leitura', 'escrita', 'administrador')", name="ck_project_groups_access_level"),
        sa.ForeignKeyConstraint(["project_id"], [f"{SCHEMA}.projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("group_id"),
        sa.UniqueConstraint("project_id", "principal_type", "identifier", name="uq_project_groups_project_type_identifier"),
        sa.UniqueConstraint("project_id", "group_id", name="uq_project_groups_project_group"),
        schema=SCHEMA,
    )
    op.add_column("project_access_groups", sa.Column("legacy_group_id", sa.String(36), nullable=True), schema=SCHEMA)
    op.execute(sa.text(f"""
        UPDATE {SCHEMA}.project_access_groups
        SET legacy_group_id = gen_random_uuid()::varchar(36)
    """))
    op.execute(sa.text(f"""
        INSERT INTO {SCHEMA}.project_groups_scoped
            (group_id, project_id, identifier, group_name, principal_type,
             access_level, source, created_at, updated_at)
        SELECT link.legacy_group_id, link.project_id, catalog.identifier, catalog.group_name,
               catalog.principal_type, link.access_level, link.source, link.created_at, link.updated_at
        FROM {SCHEMA}.project_access_groups AS link
        JOIN {SCHEMA}.project_groups AS catalog ON catalog.group_id = link.group_id
    """))
    op.execute(sa.text(f"""
        ALTER TABLE {SCHEMA}.project_access_groups
            DROP CONSTRAINT fk_project_access_groups_group,
            DROP CONSTRAINT ck_project_access_groups_access_level,
            DROP CONSTRAINT project_access_groups_pkey,
            DROP COLUMN group_id,
            RENAME COLUMN legacy_group_id TO group_id,
            ALTER COLUMN group_id SET NOT NULL,
            ADD CONSTRAINT project_access_groups_pkey PRIMARY KEY (project_id, group_id),
            ADD CONSTRAINT fk_project_access_groups_project_group
                FOREIGN KEY (project_id, group_id)
                REFERENCES {SCHEMA}.project_groups_scoped(project_id, group_id) ON DELETE CASCADE
    """))
    op.drop_index("ix_project_access_groups_access_level", table_name="project_access_groups", schema=SCHEMA)
    op.drop_index("uq_project_groups_type_identifier_ci", table_name="project_groups", schema=SCHEMA)
    op.drop_index("ix_project_groups_identifier", table_name="project_groups", schema=SCHEMA)
    op.drop_index("ix_project_groups_principal_type", table_name="project_groups", schema=SCHEMA)
    op.drop_table("project_groups", schema=SCHEMA)
    op.rename_table("project_groups_scoped", "project_groups", schema=SCHEMA)
    op.execute(sa.text(f"""
        ALTER TABLE {SCHEMA}.project_access_groups
            DROP CONSTRAINT fk_project_access_groups_project_group,
            DROP CONSTRAINT project_access_groups_pkey,
            DROP COLUMN access_level,
            DROP COLUMN source,
            DROP COLUMN created_at,
            DROP COLUMN updated_at,
            ADD CONSTRAINT project_access_groups_pkey PRIMARY KEY (project_id, group_id)
    """))
    op.execute(sa.text(
        f"GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE {SCHEMA}.project_groups TO {RUNTIME_ROLE}"
    ))
