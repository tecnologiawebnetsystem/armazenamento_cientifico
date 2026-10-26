-- Compatibilidade para bancos que ainda possuem activity_logs.entity_id VARCHAR(36).
-- O campo recebe identificadores de rota/entidade e precisa comportar até 255 caracteres.
ALTER TABLE activity_logs
    ALTER COLUMN entity_id TYPE VARCHAR(255);
