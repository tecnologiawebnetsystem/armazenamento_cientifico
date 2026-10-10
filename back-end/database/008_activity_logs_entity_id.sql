-- Permite armazenar identificadores de auditoria maiores que UUIDs.
-- Aplicar uma vez no banco já existente.
ALTER TABLE activity_logs
  ALTER COLUMN entity_id TYPE varchar(255);
