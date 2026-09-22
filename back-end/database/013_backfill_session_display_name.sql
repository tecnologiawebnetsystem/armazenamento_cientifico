BEGIN;

-- Recupera o nome local quando a sessão foi criada antes da persistência de display_name.
UPDATE sessions AS s
SET display_name = NULLIF(TRIM(u.name), '')
FROM users AS u
WHERE s.display_name IS NULL
  AND u.id = s.user_id
  AND NULLIF(TRIM(u.name), '') IS NOT NULL;

COMMIT;
