-- Script para remover tabela access_requests de bancos existentes
-- Executar após aplicar as migrações Alembic

BEGIN;

-- Remover a tabela access_requests
DROP TABLE IF EXISTS access_requests CASCADE;

-- Ajustar activity_logs para remover FK com users e permitir CAv4 subject
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;
ALTER TABLE activity_logs ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::text;

-- Confirmar alterações
COMMIT;
