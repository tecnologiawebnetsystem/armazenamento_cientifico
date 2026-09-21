-- Consultas de validação da massa 0030_seed_homologacao_projetos.sql

-- Projetos por área/status.
SELECT responsible_area, status, COUNT(*) AS total
FROM projects WHERE id LIKE 'hom-proj-%'
GROUP BY responsible_area, status ORDER BY responsible_area, status;

-- Projeto e gestor.
SELECT p.code, p.name AS projeto, p.responsible_area, p.status,
       u.name AS gestor, u.email AS gestor_email
FROM projects p
JOIN project_members pm ON pm.project_id=p.id AND pm.role='gestor'
JOIN users u ON u.id=pm.user_id
WHERE p.id LIKE 'hom-proj-%'
ORDER BY p.code;

-- Pastas em cada projeto.
SELECT p.code, p.name AS projeto, f.id AS pasta_id,
       parent.name AS pasta_pai, f.name AS pasta, f.kind
FROM folders f
JOIN projects p ON p.id=f.project_id
LEFT JOIN folders parent ON parent.id=f.parent_id
WHERE p.id LIKE 'hom-proj-%'
ORDER BY p.code, f.parent_id NULLS FIRST, f.name;

-- Usuários com acesso ao projeto.
SELECT p.code, p.name AS projeto, u.name AS usuario, u.email,
       pm.role AS acesso_projeto, pr.name AS perfil_sigac
FROM project_members pm
JOIN projects p ON p.id=pm.project_id
JOIN users u ON u.id=pm.user_id
LEFT JOIN profiles pr ON pr.id=u.profile_id
WHERE p.id LIKE 'hom-proj-%'
ORDER BY p.code, pm.role, u.name;

-- Usuários com acesso herdado a cada pasta.
SELECT p.code, f.name AS pasta, u.name AS usuario, u.email,
       pm.role AS acesso_herdado,
       CASE WHEN pm.role IN ('gestor','auditor') THEN 'gestao/auditoria' ELSE 'leitura' END AS nivel
FROM folders f
JOIN projects p ON p.id=f.project_id
JOIN project_members pm ON pm.project_id=p.id
JOIN users u ON u.id=pm.user_id
WHERE p.id LIKE 'hom-proj-%'
ORDER BY p.code, f.name, u.name;

-- Perfil SIGAC e permissões efetivas de cada usuário da massa.
SELECT DISTINCT u.email, pr.id AS perfil_id, pr.name AS perfil,
       perm.id AS permissao, pp.allowed AS permitido
FROM users u
LEFT JOIN profiles pr ON pr.id=u.profile_id
LEFT JOIN profile_permissions pp ON pp.profile_id=pr.id AND pp.allowed=TRUE
LEFT JOIN permissions perm ON perm.id=pp.permission_id
WHERE u.id IN (SELECT DISTINCT user_id FROM project_members WHERE project_id LIKE 'hom-proj-%')
ORDER BY u.email, perm.id;

-- Solicitações e logs gerados para homologação.
SELECT p.code, ar.status, ar.request_type, ar.requested_role, ar.servicenow_ticket
FROM access_requests ar JOIN projects p ON p.id=ar.project_id
WHERE p.id LIKE 'hom-proj-%' ORDER BY p.code;

SELECT p.code, al.action, u.email, al.result, al.created_at
FROM activity_logs al JOIN projects p ON p.id=al.project_id
LEFT JOIN users u ON u.id=al.user_id
WHERE p.id LIKE 'hom-proj-%' ORDER BY p.code;

-- Contagem esperada: 60 projetos, 240 pastas, 480 membros,
-- 60 solicitações e 60 logs.
SELECT
  (SELECT COUNT(*) FROM projects WHERE id LIKE 'hom-proj-%') AS projetos,
  (SELECT COUNT(*) FROM folders WHERE id LIKE 'hom-folder-%') AS pastas,
  (SELECT COUNT(*) FROM project_members pm JOIN projects p ON p.id=pm.project_id WHERE p.id LIKE 'hom-proj-%') AS membros,
  (SELECT COUNT(*) FROM access_requests WHERE id LIKE 'hom-request-%') AS solicitacoes,
  (SELECT COUNT(*) FROM activity_logs WHERE id LIKE 'hom-log-%') AS logs;
