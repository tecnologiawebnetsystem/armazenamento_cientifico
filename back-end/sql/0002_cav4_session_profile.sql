-- Correção CAV4: guardar os dados recebidos do CAV4 somente na sessão ativa.
-- Não adiciona campos de perfil à tabela users.
-- Execute uma única vez no banco PostgreSQL do SIGAC.

ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS profile_data JSONB;
