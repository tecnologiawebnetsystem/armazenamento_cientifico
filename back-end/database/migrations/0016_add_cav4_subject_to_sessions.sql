-- SIGAC migration 0016
-- Persiste somente o subject/identificador técnico retornado pelo CAV4
-- na sessão autenticada. Não cria nem persiste papéis, grupos ou permissões CAV4.

ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS cav4_subject VARCHAR(255);

COMMENT ON COLUMN sessions.cav4_subject IS
    'Identificador técnico (subject) retornado pelo CAV4 para a sessão autenticada; não representa papel, grupo ou permissão.';

-- Rollback manual, se necessário:
-- ALTER TABLE sessions DROP COLUMN IF EXISTS cav4_subject;
