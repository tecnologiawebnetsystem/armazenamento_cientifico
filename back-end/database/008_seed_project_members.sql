BEGIN;

-- Vincula todos os projetos existentes aos três gerentes CAv4 em rodízio.
-- O vínculo é definido somente por project_id + user_id.
WITH managers(user_id, position) AS (
    VALUES ('GFZ3', 0), ('GCTL', 1), ('Y1R9', 2)
), ranked_projects AS (
    SELECT id, row_number() OVER (ORDER BY code, id) - 1 AS position
    FROM projects
)
INSERT INTO project_members (project_id, user_id)
SELECT p.id, m.user_id
FROM ranked_projects p
JOIN managers m ON m.position = (p.position % 3)
ON CONFLICT (project_id, user_id) DO NOTHING;

COMMIT;

SELECT pm.user_id, count(*) AS total_projetos
FROM project_members pm
WHERE pm.user_id IN ('GFZ3', 'GCTL', 'Y1R9')
GROUP BY pm.user_id
ORDER BY pm.user_id;
