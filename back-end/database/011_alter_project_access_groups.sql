-- Estrutura final da tabela de associação.
-- A migration Alembic f41a08b790a1 cria group_ref_id, faz o backfill,
-- e então executa estas alterações estruturais. Para execução manual,
-- crie group_ref_id e preencha-o com o UUID correspondente antes de continuar.
-- O backfill deve preencher group_ref_id antes das operações destrutivas abaixo.
-- Verifique que não há NULLs nem associações sem principal correspondente.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM a25034.project_access_groups WHERE group_ref_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Backfill incompleto: project_access_groups.group_ref_id contém NULL';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM a25034.project_access_groups AS links
        LEFT JOIN a25034.project_groups AS principals
          ON principals.project_id = links.project_id
         AND principals.group_id = links.group_ref_id
        WHERE principals.group_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Backfill incompleto: há associação sem principal correspondente';
    END IF;
END $$;

DROP INDEX IF EXISTS a25034.ix_project_access_groups_access_level;
DROP INDEX IF EXISTS a25034.ix_project_access_groups_project_id;

ALTER TABLE a25034.project_access_groups
    DROP CONSTRAINT project_access_groups_pkey,
    DROP COLUMN id,
    DROP COLUMN group_name,
    DROP COLUMN group_id,
    DROP COLUMN access_level,
    DROP COLUMN source,
    DROP COLUMN created_at,
    DROP COLUMN updated_at,
    RENAME COLUMN group_ref_id TO group_id;

ALTER TABLE a25034.project_access_groups
    ALTER COLUMN group_id SET NOT NULL,
    ADD CONSTRAINT project_access_groups_pkey
        PRIMARY KEY (project_id, group_id),
    ADD CONSTRAINT fk_project_access_groups_project_group
        FOREIGN KEY (project_id, group_id)
        REFERENCES a25034.project_groups(project_id, group_id)
        ON DELETE CASCADE;
