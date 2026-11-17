-- Estrutura do cadastro de principals por projeto.
-- Executar antes do backfill da revisão Alembic f41a08b790a1.
CREATE TABLE a25034.project_groups (
    group_id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL
        REFERENCES a25034.projects(id) ON DELETE CASCADE,
    identifier VARCHAR(256) NOT NULL,
    group_name VARCHAR(256) NOT NULL,
    principal_type VARCHAR(20) NOT NULL,
    access_level VARCHAR(40) NOT NULL,
    source VARCHAR(20) NOT NULL DEFAULT 'manual',
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_project_groups_principal_type
        CHECK (principal_type IN ('group', 'role')),
    CONSTRAINT ck_project_groups_access_level
        CHECK (access_level IN ('leitura', 'escrita', 'administrador')),
    CONSTRAINT uq_project_groups_project_type_identifier
        UNIQUE (project_id, principal_type, identifier),
    CONSTRAINT uq_project_groups_project_group
        UNIQUE (project_id, group_id)
);

CREATE INDEX ix_project_groups_project_id
    ON a25034.project_groups (project_id);
CREATE INDEX ix_project_groups_access_level
    ON a25034.project_groups (access_level);
