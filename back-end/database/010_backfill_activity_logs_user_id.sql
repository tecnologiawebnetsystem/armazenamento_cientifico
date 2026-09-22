BEGIN;

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);

-- Preenche eventos antigos sem identificador, distribuindo-os de forma
-- determinística entre os três usuários corporativos informados.
WITH missing AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) - 1 AS position
  FROM activity_logs
  WHERE user_id IS NULL OR btrim(user_id) = ''
), cav4_users AS (
  SELECT * FROM (VALUES
    (0, 'GFZ3'),
    (1, 'GCTL'),
    (2, 'Y1R9')
  ) AS values_table(position, user_id)
)
UPDATE activity_logs AS logs
SET user_id = cav4_users.user_id
FROM missing
JOIN cav4_users ON cav4_users.position = (missing.position % 3)
WHERE logs.id = missing.id;

COMMIT;
