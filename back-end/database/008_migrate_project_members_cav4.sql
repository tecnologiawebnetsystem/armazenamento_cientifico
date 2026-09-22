BEGIN;

-- project_members usa o identificador técnico do CAv4, não users.id.
ALTER TABLE project_members
    DROP CONSTRAINT IF EXISTS project_members_user_id_fkey;

ALTER TABLE project_members
    ALTER COLUMN user_id TYPE VARCHAR(255)
    USING user_id::text;

COMMIT;

-- Depois desta migração, execute 008_seed_project_members.sql.
