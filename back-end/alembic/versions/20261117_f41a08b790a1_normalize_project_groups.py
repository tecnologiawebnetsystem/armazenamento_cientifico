"""Normalize project groups and identity roles.

Revision ID: f41a08b790a1
Revises: b814c0ad62ef
Create Date: 2026-11-17
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "f41a08b790a1"
down_revision: str | None = "b814c0ad62ef"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SCHEMA = "a25034"
RUNTIME_ROLE = '"a25034d_aplicacao"'


def upgrade() -> None:
    op.create_table(
        "project_groups",
        sa.Column("group_id", sa.String(length=36), nullable=False),
        sa.Column("project_id", sa.String(length=36), nullable=False),
        sa.Column("identifier", sa.String(length=256), nullable=False),
        sa.Column("group_name", sa.String(length=256), nullable=False),
        sa.Column("principal_type", sa.String(length=20), nullable=False),
        sa.Column("access_level", sa.String(length=40), nullable=False),
        sa.Column("source", sa.String(length=20), nullable=False, server_default="manual"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "principal_type IN ('group', 'role')",
            name="ck_project_groups_principal_type",
        ),
        sa.CheckConstraint(
            "access_level IN ('leitura', 'escrita', 'administrador')",
            name="ck_project_groups_access_level",
        ),
        sa.ForeignKeyConstraint(
            ["project_id"], [f"{SCHEMA}.projects.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("group_id"),
        sa.UniqueConstraint(
            "project_id",
            "principal_type",
            "identifier",
            name="uq_project_groups_project_type_identifier",
        ),
        sa.UniqueConstraint(
            "project_id", "group_id", name="uq_project_groups_project_group"
        ),
        schema=SCHEMA,
    )
    op.create_index(
        "ix_project_groups_project_id", "project_groups", ["project_id"], schema=SCHEMA
    )
    op.create_index(
        "ix_project_groups_access_level",
        "project_groups",
        ["access_level"],
        schema=SCHEMA,
    )

    op.add_column(
        "project_access_groups",
        sa.Column("group_ref_id", sa.String(length=36), nullable=True),
        schema=SCHEMA,
    )
    op.execute(
        sa.text(
            f"""
            INSERT INTO {SCHEMA}.project_groups (
                group_id, project_id, identifier, group_name, principal_type,
                access_level, source, created_at, updated_at
            )
            SELECT id, project_id, group_id, group_name, 'group',
                   access_level, source, created_at, updated_at
            FROM {SCHEMA}.project_access_groups
            """
        )
    )
    op.execute(
        sa.text(
            f"""
            UPDATE {SCHEMA}.project_access_groups
            SET group_ref_id = id
            """
        )
    )

    op.execute(
        sa.text(
            f"""
            WITH legacy_entries AS (
                SELECT p.id AS project_id, 'group' AS principal_type,
                       'leitura' AS access_level, btrim(item.name) AS identifier,
                       btrim(item.name) AS group_name
                FROM {SCHEMA}.projects AS p
                CROSS JOIN LATERAL regexp_split_to_table(
                    COALESCE(p.read_group, ''), ','
                ) AS item(name)
                WHERE btrim(item.name) <> ''
                UNION ALL
                SELECT p.id, 'group', 'escrita', btrim(item.name), btrim(item.name)
                FROM {SCHEMA}.projects AS p
                CROSS JOIN LATERAL regexp_split_to_table(
                    COALESCE(p.write_group, ''), ','
                ) AS item(name)
                WHERE btrim(item.name) <> ''
                UNION ALL
                SELECT p.id, 'role', 'leitura', btrim(item.name), btrim(item.name)
                FROM {SCHEMA}.projects AS p
                CROSS JOIN LATERAL regexp_split_to_table(
                    COALESCE(p.read_identity_role, ''), ','
                ) AS item(name)
                WHERE btrim(item.name) <> ''
                UNION ALL
                SELECT p.id, 'role', 'escrita', btrim(item.name), btrim(item.name)
                FROM {SCHEMA}.projects AS p
                CROSS JOIN LATERAL regexp_split_to_table(
                    COALESCE(p.write_identity_role, ''), ','
                ) AS item(name)
                WHERE btrim(item.name) <> ''
            ), deduplicated AS (
                SELECT DISTINCT ON (
                    project_id, principal_type, lower(identifier), access_level
                ) project_id, principal_type, access_level, identifier, group_name
                FROM legacy_entries
                ORDER BY project_id, principal_type, lower(identifier), access_level
            )
            INSERT INTO {SCHEMA}.project_groups (
                group_id, project_id, identifier, group_name, principal_type,
                access_level, source, created_at, updated_at
            )
            SELECT gen_random_uuid()::varchar(36), legacy.project_id,
                   legacy.identifier, legacy.group_name, legacy.principal_type,
                   legacy.access_level, 'legacy', now(), now()
            FROM deduplicated AS legacy
            WHERE NOT EXISTS (
                SELECT 1
                FROM {SCHEMA}.project_groups AS existing
                WHERE existing.project_id = legacy.project_id
                  AND existing.principal_type = legacy.principal_type
                  AND existing.access_level = legacy.access_level
                  AND lower(existing.group_name) = lower(legacy.group_name)
            )
            """
        )
    )
    op.execute(
        sa.text(
            f"""
            INSERT INTO {SCHEMA}.project_access_groups (
                id, project_id, group_name, group_id, access_level, source,
                created_at, updated_at
            )
            SELECT principal.group_id, principal.project_id, principal.group_name,
                   principal.group_id, principal.access_level, principal.source,
                   principal.created_at, principal.updated_at
            FROM {SCHEMA}.project_groups AS principal
            WHERE principal.source = 'legacy'
              AND NOT EXISTS (
                  SELECT 1
                  FROM {SCHEMA}.project_access_groups AS linked
                  WHERE linked.id = principal.group_id
              )
            """
        )
    )
    op.execute(
        sa.text(
            f"""
            UPDATE {SCHEMA}.project_access_groups
            SET group_ref_id = id
            WHERE group_ref_id IS NULL
            """
        )
    )

    op.drop_index(
        "ix_project_access_groups_access_level", table_name="project_access_groups", schema=SCHEMA
    )
    op.drop_index(
        "ix_project_access_groups_project_id", table_name="project_access_groups", schema=SCHEMA
    )
    op.execute(
        sa.text(
            f"""
            ALTER TABLE {SCHEMA}.project_access_groups
                DROP CONSTRAINT project_access_groups_pkey,
                DROP COLUMN id,
                DROP COLUMN group_name,
                DROP COLUMN group_id,
                DROP COLUMN access_level,
                DROP COLUMN source,
                DROP COLUMN created_at,
                DROP COLUMN updated_at,
                RENAME COLUMN group_ref_id TO group_id
            """
        )
    )
    op.execute(
        sa.text(
            f"""
            ALTER TABLE {SCHEMA}.project_access_groups
                ALTER COLUMN group_id SET NOT NULL,
                ADD CONSTRAINT project_access_groups_pkey
                    PRIMARY KEY (project_id, group_id),
                ADD CONSTRAINT fk_project_access_groups_project_group
                    FOREIGN KEY (project_id, group_id)
                    REFERENCES {SCHEMA}.project_groups(project_id, group_id)
                    ON DELETE CASCADE
            """
        )
    )
    op.execute(
        sa.text(
            f"GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE {SCHEMA}.project_groups TO {RUNTIME_ROLE}"
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            f"REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE {SCHEMA}.project_groups FROM {RUNTIME_ROLE}"
        )
    )
    op.execute(
        sa.text(
            f"""
            ALTER TABLE {SCHEMA}.project_access_groups
                DROP CONSTRAINT fk_project_access_groups_project_group,
                DROP CONSTRAINT project_access_groups_pkey,
                RENAME COLUMN group_id TO group_ref_id
            """
        )
    )
    op.execute(
        sa.text(
            f"""
            ALTER TABLE {SCHEMA}.project_access_groups
                ADD COLUMN id varchar(36),
                ADD COLUMN group_name varchar(256),
                ADD COLUMN group_id varchar(36),
                ADD COLUMN access_level varchar(40),
                ADD COLUMN source varchar(20),
                ADD COLUMN created_at timestamptz,
                ADD COLUMN updated_at timestamptz
            """
        )
    )
    op.execute(
        sa.text(
            f"""
            DELETE FROM {SCHEMA}.project_access_groups AS link
            USING {SCHEMA}.project_groups AS principal
            WHERE link.group_ref_id = principal.group_id
              AND principal.principal_type = 'role'
            """
        )
    )
    op.execute(
        sa.text(
            f"""
            UPDATE {SCHEMA}.project_access_groups AS link
            SET id = principal.group_id,
                group_name = principal.group_name,
                group_id = CASE
                    WHEN length(principal.identifier) <= 36 THEN principal.identifier
                    ELSE principal.group_id
                END,
                access_level = principal.access_level,
                source = principal.source,
                created_at = principal.created_at,
                updated_at = principal.updated_at
            FROM {SCHEMA}.project_groups AS principal
            WHERE link.group_ref_id = principal.group_id
            """
        )
    )
    op.execute(
        sa.text(
            f"""
            ALTER TABLE {SCHEMA}.projects
                ALTER COLUMN write_group TYPE text,
                ALTER COLUMN read_group TYPE text,
                ALTER COLUMN write_identity_role TYPE text,
                ALTER COLUMN read_identity_role TYPE text
            """
        )
    )
    op.execute(
        sa.text(
            f"""
            UPDATE {SCHEMA}.projects AS project
            SET read_group = COALESCE((
                    SELECT string_agg(group_name, ', ' ORDER BY group_name)
                    FROM {SCHEMA}.project_groups
                    WHERE project_id = project.id AND principal_type = 'group'
                      AND access_level = 'leitura'
                ), ''),
                write_group = COALESCE((
                    SELECT string_agg(group_name, ', ' ORDER BY group_name)
                    FROM {SCHEMA}.project_groups
                    WHERE project_id = project.id AND principal_type = 'group'
                      AND access_level = 'escrita'
                ), ''),
                read_identity_role = COALESCE((
                    SELECT string_agg(identifier, ', ' ORDER BY identifier)
                    FROM {SCHEMA}.project_groups
                    WHERE project_id = project.id AND principal_type = 'role'
                      AND access_level = 'leitura'
                ), ''),
                write_identity_role = COALESCE((
                    SELECT string_agg(identifier, ', ' ORDER BY identifier)
                    FROM {SCHEMA}.project_groups
                    WHERE project_id = project.id AND principal_type = 'role'
                      AND access_level = 'escrita'
                ), '')
            """
        )
    )
    op.execute(
        sa.text(
            f"""
            ALTER TABLE {SCHEMA}.project_access_groups
                DROP COLUMN group_ref_id,
                ALTER COLUMN id SET NOT NULL,
                ALTER COLUMN group_name SET NOT NULL,
                ALTER COLUMN group_id SET NOT NULL,
                ALTER COLUMN access_level SET NOT NULL,
                ALTER COLUMN source SET DEFAULT 'manual',
                ALTER COLUMN source SET NOT NULL,
                ALTER COLUMN created_at SET NOT NULL,
                ALTER COLUMN updated_at SET NOT NULL,
                ADD CONSTRAINT project_access_groups_pkey PRIMARY KEY (id)
            """
        )
    )
    op.create_index(
        "ix_project_access_groups_project_id", "project_access_groups", ["project_id"], schema=SCHEMA
    )
    op.create_index(
        "ix_project_access_groups_access_level",
        "project_access_groups",
        ["access_level"],
        schema=SCHEMA,
    )
    op.drop_table("project_groups", schema=SCHEMA)
