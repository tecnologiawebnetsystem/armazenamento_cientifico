-- A tabela sessions deve armazenar o código funcional do usuário (ex.: GFZE),
-- e não o UUID/hash da chave users.id.
-- Execute no schema a25034 após publicar o backend.

ALTER TABLE a25034.sessions
  DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;

ALTER TABLE a25034.sessions
  ALTER COLUMN user_id TYPE varchar(80);

UPDATE a25034.sessions s
SET user_id = u.user_id
FROM a25034.users u
WHERE s.user_id = u.id;

CREATE INDEX IF NOT EXISTS ix_sessions_user_id ON a25034.sessions (user_id);

-- Verificação:
-- SELECT id, user_id FROM a25034.sessions ORDER BY created_at DESC;
-- O resultado esperado é GFZE, GBTF etc., nunca o UUID/hash.
