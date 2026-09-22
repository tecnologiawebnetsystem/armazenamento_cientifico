BEGIN;

-- Distribui os projetos existentes em rodízio entre os três gerentes CAv4.
-- O script é idempotente: executar novamente não duplica vínculos.
WITH managers(user_id, position) AS (
    VALUES ('GFZ3', 0), ('GCTL', 1), ('Y1R9', 2)
), ranked_projects AS (
    SELECT id, row_number() OVER (ORDER BY code, id) - 1 AS position
    FROM projects
)
INSERT INTO project_members (project_id, user_id, role)
SELECT p.id, m.user_id, 'gerente'
FROM ranked_projects p
JOIN managers m ON m.position = (p.position % 3)
ON CONFLICT (project_id, user_id) DO UPDATE
SET role = EXCLUDED.role;

COMMIT;

SELECT pm.user_id, pm.role, count(*) AS total_projetos
FROM project_members pm
WHERE pm.user_id IN ('GFZ3', 'GCTL', 'Y1R9')
GROUP BY pm.user_id, pm.role
ORDER BY pm.user_id;
