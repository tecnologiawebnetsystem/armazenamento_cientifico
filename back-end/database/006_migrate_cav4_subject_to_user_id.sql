BEGIN;

-- Preserva o identificador CAv4 na coluna user_id e remove a coluna legada.
ALTER TABLE sessions
    DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;

ALTER TABLE sessions
    ALTER COLUMN user_id TYPE VARCHAR(255)
    USING user_id::text;

UPDATE sessions
SET user_id = cav4_subject
WHERE cav4_subject IS NOT NULL
  AND (user_id IS NULL OR user_id = '');

ALTER TABLE sessions
    DROP COLUMN IF EXISTS cav4_subject;

COMMIT;

-- Conferência: a coluna legada não deve aparecer.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = current_schema()
  AND table_name = 'sessions'
  AND column_name IN ('user_id', 'cav4_subject');
