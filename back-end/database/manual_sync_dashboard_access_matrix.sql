-- SIGAC — sincroniza a rota Dashboard com a matriz de módulos/perfis.
-- Script manual de dados para validação; não é uma migration e não altera Alembic.
-- Pré-requisito: executar no schema/search_path do SIGAC após 001_estrutura_completa.sql
-- e 002_inserts_completos.sql, onde as tabelas de matriz e menu_permissions já existem.
-- Política alinhada aos cards do Dashboard: ADM, GER, AUD e PAT podem visualizar;
-- os demais perfis (incluindo SOL e OPR) não recebem acesso.
\set ON_ERROR_STOP on
BEGIN;

INSERT INTO modules (id, name, route, icon, display_order, active)
VALUES ('dashboard', 'Dashboard', '/dashboard', 'layout-dashboard', 1, true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    route = EXCLUDED.route,
    icon = EXCLUDED.icon,
    display_order = EXCLUDED.display_order,
    active = EXCLUDED.active;

INSERT INTO permissions (id, module_id, name, description, active)
VALUES ('dashboard.visualizar', 'dashboard', 'Visualizar Dashboard', 'Acessar o Dashboard da plataforma', true)
ON CONFLICT (id) DO UPDATE
SET module_id = EXCLUDED.module_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    active = EXCLUDED.active;

INSERT INTO menus (id, module_id, parent_id, name, route, icon, display_order, active)
VALUES ('menu-dashboard', 'dashboard', NULL, 'Dashboard', '/dashboard', 'layout-dashboard', 1, true)
ON CONFLICT (id) DO UPDATE
SET module_id = EXCLUDED.module_id,
    parent_id = EXCLUDED.parent_id,
    name = EXCLUDED.name,
    route = EXCLUDED.route,
    icon = EXCLUDED.icon,
    display_order = EXCLUDED.display_order,
    active = EXCLUDED.active;

INSERT INTO menu_permissions (menu_id, permission_id, allowed)
VALUES ('menu-dashboard', 'dashboard.visualizar', true)
ON CONFLICT (menu_id, permission_id) DO UPDATE
SET allowed = EXCLUDED.allowed;

INSERT INTO profile_modules (profile_id, module_id, can_view)
SELECT p.id, 'dashboard', p.id IN ('ADM', 'GER', 'AUD', 'PAT')
FROM profiles AS p
ON CONFLICT (profile_id, module_id) DO UPDATE
SET can_view = EXCLUDED.can_view;

INSERT INTO profile_permissions (profile_id, permission_id, allowed)
SELECT p.id, 'dashboard.visualizar', p.id IN ('ADM', 'GER', 'AUD', 'PAT')
FROM profiles AS p
ON CONFLICT (profile_id, permission_id) DO UPDATE
SET allowed = EXCLUDED.allowed;

COMMIT;

-- Validação esperada: can_view e allowed devem ser true somente para ADM, GER, AUD e PAT.
SELECT p.id AS profile_id,
       p.name AS profile_name,
       pm.can_view,
       pp.allowed AS permission_allowed,
       m.route
FROM profiles AS p
LEFT JOIN profile_modules AS pm
  ON pm.profile_id = p.id AND pm.module_id = 'dashboard'
LEFT JOIN profile_permissions AS pp
  ON pp.profile_id = p.id AND pp.permission_id = 'dashboard.visualizar'
JOIN menus AS m
  ON m.id = 'menu-dashboard'
ORDER BY p.id;
