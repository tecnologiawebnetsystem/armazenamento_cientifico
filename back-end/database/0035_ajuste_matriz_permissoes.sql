-- Ajuste parametrizado da matriz de acesso do CAV4
-- O acesso é controlado pelas tabelas de perfis, módulos, menus e permissões.
-- Este script não cria banco nem executa Alembic automaticamente.
-- Execute após 001_estrutura_completa.sql e 002_inserts_completos.sql.
\set ON_ERROR_STOP on
BEGIN;

-- Garante os registros parametrizadores utilizados pelo menu Configurações.
INSERT INTO profiles (id, name, description, created_at)
VALUES (
  'OPR',
  'operador',
  'Acessa exclusivamente o menu Configurações.',
  CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description;

INSERT INTO modules (id, name, route, icon, display_order, active)
VALUES (
  'configuracoes',
  'Configurações',
  '/configuracoes',
  'settings',
  70,
  true
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    route = EXCLUDED.route,
    icon = EXCLUDED.icon,
    display_order = EXCLUDED.display_order,
    active = EXCLUDED.active;

INSERT INTO permissions (id, module_id, name, description, active)
VALUES (
  'administracao.configurar',
  'configuracoes',
  'Configurar plataforma',
  'Gerenciar configurações da plataforma',
  true
)
ON CONFLICT (id) DO UPDATE
SET module_id = EXCLUDED.module_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    active = EXCLUDED.active;

INSERT INTO menus (id, module_id, name, route, icon, display_order, active)
VALUES (
  'menu-configuracoes',
  'configuracoes',
  'Configurações',
  '/configuracoes',
  'settings',
  70,
  true
)
ON CONFLICT (id) DO UPDATE
SET module_id = EXCLUDED.module_id,
    name = EXCLUDED.name,
    route = EXCLUDED.route,
    icon = EXCLUDED.icon,
    display_order = EXCLUDED.display_order,
    active = EXCLUDED.active;

INSERT INTO menu_permissions (menu_id, permission_id, allowed)
VALUES ('menu-configuracoes', 'administracao.configurar', true)
ON CONFLICT (menu_id, permission_id) DO UPDATE
SET allowed = EXCLUDED.allowed;

-- OPR pode visualizar somente o módulo Configurações.
INSERT INTO profile_modules (profile_id, module_id, can_view)
SELECT 'OPR', m.id, (m.id = 'configuracoes')
FROM modules AS m
WHERE m.active = true
ON CONFLICT (profile_id, module_id) DO UPDATE
SET can_view = EXCLUDED.can_view;

-- OPR recebe somente a permissão parametrizada do menu Configurações.
INSERT INTO profile_permissions (profile_id, permission_id, allowed)
SELECT 'OPR', p.id, (p.id = 'administracao.configurar')
FROM permissions AS p
WHERE p.active = true
ON CONFLICT (profile_id, permission_id) DO UPDATE
SET allowed = EXCLUDED.allowed;

-- Configurações é exclusiva do OPR: remove qualquer concessão ao ADM
-- e bloqueia a visualização do módulo para os demais perfis existentes.
INSERT INTO profile_modules (profile_id, module_id, can_view)
SELECT p.id, 'configuracoes', (p.id = 'OPR')
FROM profiles AS p
ON CONFLICT (profile_id, module_id) DO UPDATE
SET can_view = EXCLUDED.can_view;

INSERT INTO profile_permissions (profile_id, permission_id, allowed)
SELECT p.id, 'administracao.configurar', (p.id = 'OPR')
FROM profiles AS p
ON CONFLICT (profile_id, permission_id) DO UPDATE
SET allowed = EXCLUDED.allowed;

COMMIT;

-- Validação: deve retornar somente OPR como acesso ativo a Configurações.
-- SELECT p.id, p.name, pm.can_view, pp.allowed
-- FROM profiles p
-- LEFT JOIN profile_modules pm ON pm.profile_id = p.id AND pm.module_id = 'configuracoes'
-- LEFT JOIN profile_permissions pp ON pp.profile_id = p.id AND pp.permission_id = 'administracao.configurar'
-- ORDER BY p.id;

-- Vinculação de usuários do CAV4 ao perfil Operador (ajuste o e-mail):
-- UPDATE users
-- SET profile_id = 'OPR', role = 'operador'
-- WHERE email = 'usuario@empresa.com';

-- Para executar a migration do Alembic separadamente, use:
-- alembic upgrade head
