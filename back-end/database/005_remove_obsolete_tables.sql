-- Remove tabelas descontinuadas do SIGAC.
-- Execute com backup aprovado. O script é idempotente.
BEGIN;

DROP TABLE IF EXISTS permission_matrix CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;

COMMIT;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = current_schema()
  AND table_name IN ('permission_matrix', 'system_settings');
