-- SIGAC / armazenamento_cientifico
-- Migração 0022: remove a tabela redundante de matriz de permissões.
-- Executar no PostgreSQL/Amazon Aurora PostgreSQL após validar backup e dependências.

DROP TABLE IF EXISTS permission_matrix;

-- A autorização permanece nas tabelas profiles, permissions,
-- profile_permissions, profile_modules e project_members.

COMMIT;
