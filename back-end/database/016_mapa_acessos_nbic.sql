-- SIGAC / NBIC
-- Migration 016: Mapa de Acessos Científico
-- Idempotente. Executar após 015_matriz_acesso_perfis.sql.
-- Não remove dados transacionais. Não cria grupos fictícios.
-- O mapa usa projects, project_members e folders como fonte oficial.

\set ON_ERROR_STOP on
BEGIN;

-- 1. Módulo e menu: renomeia Pesquisa para Mapa de Acessos.
INSERT INTO modules (id, name, route, icon, display_order, active)
VALUES ('pesquisas', 'Mapa de Acessos', '/pesquisas', 'search', 60, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  route = EXCLUDED.route,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  active = EXCLUDED.active;

INSERT INTO permissions (id, module_id, name, description, active)
VALUES (
  'pesquisa.visualizar',
  'pesquisas',
  'Visualizar mapa de acessos',
  'Consultar projetos, grupos, membros, pastas e níveis de acesso autorizados',
  true
)
ON CONFLICT (id) DO UPDATE SET
  module_id = EXCLUDED.module_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  active = EXCLUDED.active;

INSERT INTO menus (id, module_id, parent_id, name, route, icon, display_order, active)
VALUES ('menu-pesquisas', 'pesquisas', NULL, 'Mapa de Acessos', '/pesquisas', 'search', 60, true)
ON CONFLICT (id) DO UPDATE SET
  module_id = EXCLUDED.module_id,
  name = EXCLUDED.name,
  route = EXCLUDED.route,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  active = EXCLUDED.active;

INSERT INTO menu_permissions (menu_id, permission_id, allowed)
VALUES ('menu-pesquisas', 'pesquisa.visualizar', true)
ON CONFLICT (menu_id, permission_id) DO UPDATE SET allowed = EXCLUDED.allowed;

-- 2. Índices para a consulta do mapa.
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_area_status ON projects(responsible_area, status);
CREATE INDEX IF NOT EXISTS idx_folders_project_updated ON folders(project_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_role_area ON users(role, area);

-- 3. Campos configuráveis do relatório/mapa de acessos.
INSERT INTO report_types (id, code, name, description, formats, active)
VALUES (
  'ACESSOS', 'acessos', 'Mapa de Acessos',
  'Projetos, grupos, membros, pastas e níveis de acesso autorizados.',
  'csv,xlsx,pdf', true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  formats = EXCLUDED.formats,
  active = EXCLUDED.active;

INSERT INTO report_fields (id, report_code, field_key, label, source_key, display_order, active)
VALUES
 ('acessos-usuario-id', 'acessos', 'userId', 'Identificador do usuário', 'userId', 10, true),
 ('acessos-usuario', 'acessos', 'userName', 'Membro', 'userName', 20, true),
 ('acessos-email', 'acessos', 'userEmail', 'E-mail', 'userEmail', 30, true),
 ('acessos-perfil', 'acessos', 'userRole', 'Perfil', 'userRole', 40, true),
 ('acessos-area', 'acessos', 'area', 'Área', 'area', 50, true),
 ('acessos-projeto-id', 'acessos', 'projectId', 'Identificador do projeto', 'projectId', 60, true),
 ('acessos-projeto', 'acessos', 'projectName', 'Projeto', 'projectName', 70, true),
 ('acessos-status-projeto', 'acessos', 'projectStatus', 'Status do projeto', 'projectStatus', 80, true),
 ('acessos-recurso', 'acessos', 'resourceName', 'Recurso', 'resourceName', 90, true),
 ('acessos-tipo-recurso', 'acessos', 'resourceType', 'Tipo de recurso', 'resourceType', 100, true),
 ('acessos-nivel', 'acessos', 'accessLevel', 'Nível de acesso', 'accessLevel', 110, true),
 ('acessos-pasta', 'acessos', 'folderPath', 'Pasta', 'folderPath', 120, true),
 ('acessos-ultima-visualizacao', 'acessos', 'lastViewedAt', 'Última visualização', 'lastViewedAt', 130, true),
 ('acessos-atualizado-em', 'acessos', 'updatedAt', 'Atualizado em', 'updatedAt', 140, true)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  source_key = EXCLUDED.source_key,
  display_order = EXCLUDED.display_order,
  active = EXCLUDED.active;

-- 4. Garante acesso ao módulo para os perfis autorizados.
INSERT INTO profile_modules (profile_id, module_id, can_view)
SELECT p.id, 'pesquisas', true
FROM profiles p
WHERE p.id IN ('ADM', 'GER', 'PAT', 'AUD')
ON CONFLICT (profile_id, module_id) DO UPDATE SET can_view = EXCLUDED.can_view;

INSERT INTO profile_permissions (profile_id, permission_id, allowed)
SELECT p.id, 'pesquisa.visualizar', true
FROM profiles p
WHERE p.id IN ('ADM', 'GER', 'PAT', 'AUD')
ON CONFLICT (profile_id, permission_id) DO UPDATE SET allowed = EXCLUDED.allowed;

-- 5. Registro de versão.
INSERT INTO schema_migrations (version)
VALUES ('016_mapa_acessos_nbic')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- Validações pós-execução:
-- SELECT id, name, route, active FROM modules WHERE id = 'pesquisas';
-- SELECT id, name, route, active FROM menus WHERE id = 'menu-pesquisas';
-- SELECT * FROM permissions WHERE id = 'pesquisa.visualizar';
-- SELECT * FROM profile_modules WHERE module_id = 'pesquisas';
-- SELECT * FROM profile_permissions WHERE permission_id = 'pesquisa.visualizar';
-- SELECT id, field_key, label, active FROM report_fields WHERE report_code = 'acessos' ORDER BY display_order;
-- SELECT version, applied_at FROM schema_migrations WHERE version = '016_mapa_acessos_nbic';

-- Observação: execute também o baseline 0001 somente em banco novo. Em banco já existente,
-- use esta migration 016 para não reaplicar a consolidação inteira.
