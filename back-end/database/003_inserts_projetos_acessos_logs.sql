-- SIGAC / Aurora PostgreSQL
-- Seed de dados operacionais para projetos, folders, membros e auditoria.
-- Execute após 001_estrutura_completa.sql e 002_inserts_completos.sql.
-- Os códigos GFZ3, GCTL e GBTF recebem 20 projetos cada.
\set ON_ERROR_STOP on
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users) THEN
    RAISE EXCEPTION 'O seed requer pelo menos um usuário cadastrado em users';
  END IF;
END $$;

-- 60 projetos: 20 por chave operacional.
WITH grupos AS (
  SELECT * FROM (VALUES
    ('GFZ3', 'Gestão Financeira e Zoneamento 3', 'governanca-compliance'),
    ('GCTL', 'Gestão de Controle e Tecnologia Logística', 'tecnologia'),
    ('GBTF', 'Gestão de Bases Técnicas e Fomento', 'pesquisa')
  ) AS g(codigo, nome, area)
), novos AS (
  SELECT
    g.codigo || '-' || lpad(n::text, 2, '0') AS code,
    g.nome || ' - Projeto ' || lpad(n::text, 2, '0') AS name,
    g.area,
    g.codigo,
    n
  FROM grupos g CROSS JOIN generate_series(1, 20) AS n
)
INSERT INTO projects (
  id, name, code, responsible_area, managers_ids, write_group, read_group,
  write_identity_role, read_identity_role, snow_task_number, parent_folder,
  description, status, participants_ids
)
SELECT
  md5('project:' || code), name, code, area,
  '[]'::jsonb, codigo || '-WRITERS', codigo || '-READERS',
  'gestor', 'leitor', 'SNOW-' || codigo || '-' || lpad(n::text, 4, '0'),
  '/' || lower(codigo),
  'Projeto operacional de demonstração do agrupamento ' || codigo || '.',
  CASE WHEN n % 10 = 0 THEN 'pausado' WHEN n % 7 = 0 THEN 'em_implantacao' ELSE 'ativo' END,
  '[]'::jsonb
FROM novos
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  responsible_area = EXCLUDED.responsible_area,
  write_group = EXCLUDED.write_group,
  read_group = EXCLUDED.read_group,
  snow_task_number = EXCLUDED.snow_task_number,
  parent_folder = EXCLUDED.parent_folder,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  updated_at = now();

-- Pastas raiz e subpastas relacionadas a cada projeto.
WITH projetos AS (
  SELECT id, code, row_number() OVER (ORDER BY code) AS seq
  FROM projects
  WHERE code ~ '^(GFZ3|GCTL|GBTF)-([0-9]{2})$'
), pasta_raiz AS (
  INSERT INTO folders (id, project_id, parent_id, kind, name, size_bytes, mime_type, created_by, last_viewed_at)
  SELECT md5('folder:root:' || p.code), p.id, NULL, 'pasta', 'Documentos do projeto', 0, 'inode/directory', u.id, now() - (p.seq || ' days')::interval
  FROM projetos p CROSS JOIN LATERAL (SELECT id FROM users ORDER BY id LIMIT 1) u
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = now()
  RETURNING id, project_id
)
INSERT INTO folders (id, project_id, parent_id, kind, name, size_bytes, mime_type, created_by, last_viewed_at)
SELECT
  md5('folder:' || p.code || ':' || tipo.nome), p.id, r.id, 'pasta', tipo.nome,
  (p.seq * 1024)::bigint, 'inode/directory', u.id, now() - ((p.seq + tipo.ordem) || ' days')::interval
FROM projetos p
JOIN pasta_raiz r ON r.project_id = p.id
CROSS JOIN (VALUES ('Dados brutos', 1), ('Resultados', 2), ('Documentação', 3)) AS tipo(nome, ordem)
CROSS JOIN LATERAL (SELECT id FROM users ORDER BY id LIMIT 1) u
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id, updated_at = now();

-- Até três usuários existentes como membros de cada projeto.
INSERT INTO project_members (project_id, user_id, role)
SELECT p.id, u.id,
  CASE row_number() OVER (PARTITION BY p.id ORDER BY u.id)
    WHEN 1 THEN 'owner' WHEN 2 THEN 'editor' ELSE 'viewer' END
FROM projects p
CROSS JOIN LATERAL (SELECT id FROM users ORDER BY id LIMIT 3) u
WHERE p.code ~ '^(GFZ3|GCTL|GBTF)-([0-9]{2})$'
ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- Logs de auditoria: 12 eventos por projeto, totalizando 720 linhas.
WITH projetos AS (
  SELECT id, code FROM projects WHERE code ~ '^(GFZ3|GCTL|GBTF)-([0-9]{2})$'
), eventos AS (
  SELECT * FROM (VALUES
    (1, 'project.created', 'created', 'success'),
    (2, 'project.updated', 'updated', 'success'),
    (3, 'member.added', 'project_member', 'success'),
    (4, 'folder.created', 'folder', 'success'),
    (5, 'folder.viewed', 'folder', 'success'),
    (6, 'access.requested', 'access_request', 'pending'),
    (7, 'access.approved', 'access_request', 'success'),
    (8, 'report.generated', 'report', 'success'),
    (9, 'report.exported', 'report', 'success'),
    (10, 'project.status_changed', 'project', 'success'),
    (11, 'member.updated', 'project_member', 'success'),
    (12, 'project.reviewed', 'project', 'success')
  ) AS e(ordem, action, entity, result)
)
INSERT INTO activity_logs (id, user_id, action, entity, entity_id, details, result, created_at)
SELECT
  md5('activity:' || p.code || ':' || e.ordem),
  u.id,
  e.action,
  e.entity,
  p.id,
  'Evento operacional do projeto ' || p.code || ' (' || e.ordem || '/12).',
  e.result,
  now() - ((row_number() OVER (ORDER BY p.code, e.ordem)) || ' hours')::interval
FROM projetos p
CROSS JOIN eventos e
CROSS JOIN LATERAL (SELECT id FROM users ORDER BY id LIMIT 1) u
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  action = EXCLUDED.action,
  entity = EXCLUDED.entity,
  entity_id = EXCLUDED.entity_id,
  details = EXCLUDED.details,
  result = EXCLUDED.result,
  created_at = EXCLUDED.created_at;

COMMIT;

-- Conferência rápida após a execução:
-- SELECT split_part(code, '-', 1) AS chave, count(*) FROM projects WHERE code ~ '^(GFZ3|GCTL|GBTF)-' GROUP BY 1 ORDER BY 1;
-- SELECT count(*) AS folders FROM folders WHERE project_id IN (SELECT id FROM projects WHERE code ~ '^(GFZ3|GCTL|GBTF)-');
-- SELECT count(*) AS membros FROM project_members WHERE project_id IN (SELECT id FROM projects WHERE code ~ '^(GFZ3|GCTL|GBTF)-');
-- SELECT count(*) AS logs FROM activity_logs WHERE entity_id IN (SELECT id FROM projects WHERE code ~ '^(GFZ3|GCTL|GBTF)-');
