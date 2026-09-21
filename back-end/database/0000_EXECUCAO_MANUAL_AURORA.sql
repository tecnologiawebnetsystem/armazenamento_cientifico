-- SIGAC / PostgreSQL Aurora
-- ORDEM MANUAL OFICIAL
-- Execute a migration consolidada e única:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f 0001_aurora_consolidated.sql
--
-- Este arquivo existe apenas como orientação para execução manual.
-- Não execute os arquivos de database/legacy/.

\set ON_ERROR_STOP on
\i 0001_aurora_consolidated.sql

-- Após a migration, execute a validação somente leitura que acompanha
-- o repositório, quando disponível no ambiente operacional.
