BEGIN;

ALTER TABLE project_members
    DROP COLUMN IF EXISTS role;

COMMIT;

SELECT column_name
FROM information_schema.columns
WHERE table_schema = current_schema()
  AND table_name = 'project_members'
  AND column_name = 'role';
