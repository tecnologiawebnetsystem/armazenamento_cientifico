BEGIN;

DROP TABLE IF EXISTS project_types CASCADE;

COMMIT;

-- Validação: não deve retornar nenhuma linha.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = current_schema()
  AND table_name = 'project_types';
