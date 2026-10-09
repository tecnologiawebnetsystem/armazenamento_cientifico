\set ON_ERROR_STOP on
BEGIN;

-- ================================================================
-- 007_matriz_autorizacao_parametrizada.sql
-- Atualiza a autorização exclusivamente pelas tabelas de catálogo.
-- Não altera rotas nem cria regras de perfil fixas no front-end.
-- ================================================================

-- 1) Nomenclatura funcional exibida no front-end.
UPDATE modules
SET name = 'Área de Rede'
WHERE id = 'projetos';

UPDATE menus
SET name = 'Área de Rede'
WHERE id = 'menu-projetos';

UPDATE project_statuses
SET name = REPLACE(name, 'Projeto', 'Área de Rede')
WHERE name ILIKE '%Projeto%';

UPDATE report_types
SET name = REPLACE(name, 'Projetos', 'Áreas de Rede'),
    description = REPLACE(description, 'Projetos', 'Áreas de Rede')
WHERE code = 'projetos';

UPDATE report_fields
SET label = REPLACE(REPLACE(label, 'Projeto', 'Área de Rede'), 'projeto', 'área de rede')
WHERE report_code IN ('projetos', 'acessos');

-- 2) Catálogo de perfis. Os IDs são as chaves já utilizadas por users/profile_id.
INSERT INTO profiles (id, name, description)
VALUES
  ('ADM', 'administrador', 'Acesso administrativo total à plataforma.'),
  ('GER', 'gerente', 'Acesso às áreas de rede sob sua gestão ou supervisão.'),
  ('AUD', 'auditor', 'Consulta registros de auditoria.'),
  ('PAT', 'patrocinador', 'Acompanha áreas de rede e relatórios autorizados.'),
  ('SOL', 'solicitante', 'Acompanha solicitações autorizadas.'),
  ('OPR', 'operador', 'Acessa exclusivamente as configurações autorizadas.')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description;

-- 3) Catálogo de módulos. O id técnico permanece estável para não quebrar APIs.
INSERT INTO modules (id, name, route, icon, display_order, active)
VALUES
  ('dashboard', 'Dashboard', '/dashboard', 'layout-dashboard', 1, true),
  ('projetos', 'Área de Rede', '/projetos', 'folder', 10, true),
  ('relatorios', 'Relatórios', '/relatorios', 'chart', 30, true),
  ('auditoria', 'Logs e Auditoria', '/logs', 'history', 50, true),
  ('pesquisas', 'Mapa de Acessos', '/pesquisas', 'search', 60, true),
  ('configuracoes', 'Configurações', '/configuracoes', 'settings', 70, true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    route = EXCLUDED.route,
    icon = EXCLUDED.icon,
    display_order = EXCLUDED.display_order,
    active = EXCLUDED.active;

-- 4) Permissões funcionais. A permissão de criação fica exclusiva do Administrador.
INSERT INTO permissions (id, module_id, name, description, active)
VALUES
  ('projeto.visualizar', 'projetos', 'Visualizar Área de Rede', 'Consultar áreas de rede conforme o escopo do perfil.', true),
  ('projeto.criar', 'projetos', 'Criar Área de Rede', 'Criar uma nova área de rede.', true),
  ('projeto.editar', 'projetos', 'Editar Área de Rede', 'Editar uma área de rede autorizada.', true),
  ('projeto.status', 'projetos', 'Alterar status da Área de Rede', 'Alterar o status de uma área de rede autorizada.', true),
  ('projeto.excluir', 'projetos', 'Excluir Área de Rede', 'Excluir uma área de rede autorizada.', true),
  ('relatorio.visualizar', 'relatorios', 'Visualizar relatórios', 'Consultar relatórios autorizados.', true),
  ('relatorio.exportar', 'relatorios', 'Exportar relatórios', 'Exportar relatórios nos formatos cadastrados.', true),
  ('auditoria.visualizar', 'auditoria', 'Visualizar auditoria', 'Consultar logs de auditoria.', true),
  ('pesquisa.visualizar', 'pesquisas', 'Visualizar mapa de acessos', 'Consultar o mapa de acessos conforme o escopo do perfil.', true),
  ('administracao.configurar', 'configuracoes', 'Configurar administração', 'Gerenciar módulos, menus, permissões, perfis e relatórios.', true),
  ('dashboard.visualizar', 'dashboard', 'Visualizar Dashboard', 'Acessar o dashboard da plataforma.', true)
ON CONFLICT (id) DO UPDATE
SET module_id = EXCLUDED.module_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    active = EXCLUDED.active;

-- 5) Menus e vínculo entre menu e permissão.
INSERT INTO menus (id, module_id, parent_id, name, route, icon, display_order, active)
VALUES
  ('menu-dashboard', 'dashboard', NULL, 'Dashboard', '/dashboard', 'layout-dashboard', 1, true),
  ('menu-projetos', 'projetos', NULL, 'Área de Rede', '/projetos', 'folder', 10, true),
  ('menu-relatorios', 'relatorios', NULL, 'Relatórios', '/relatorios', 'chart', 30, true),
  ('menu-auditoria', 'auditoria', NULL, 'Logs e Auditoria', '/logs', 'history', 50, true),
  ('menu-pesquisas', 'pesquisas', NULL, 'Mapa de Acessos', '/pesquisas', 'search', 60, true),
  ('menu-configuracoes', 'configuracoes', NULL, 'Configurações', '/configuracoes', 'settings', 70, true)
ON CONFLICT (id) DO UPDATE
SET module_id = EXCLUDED.module_id,
    parent_id = EXCLUDED.parent_id,
    name = EXCLUDED.name,
    route = EXCLUDED.route,
    icon = EXCLUDED.icon,
    display_order = EXCLUDED.display_order,
    active = EXCLUDED.active;

INSERT INTO menu_permissions (menu_id, permission_id, allowed)
VALUES
  ('menu-dashboard', 'dashboard.visualizar', true),
  ('menu-projetos', 'projeto.visualizar', true),
  ('menu-relatorios', 'relatorio.visualizar', true),
  ('menu-auditoria', 'auditoria.visualizar', true),
  ('menu-pesquisas', 'pesquisa.visualizar', true),
  ('menu-configuracoes', 'administracao.configurar', true)
ON CONFLICT (menu_id, permission_id) DO UPDATE
SET allowed = EXCLUDED.allowed;

-- 6) Matriz de módulos por perfil.
WITH matriz(profile_id, module_id, can_view) AS (
  VALUES
    ('ADM','dashboard',true), ('ADM','projetos',true), ('ADM','relatorios',true), ('ADM','auditoria',true), ('ADM','pesquisas',true), ('ADM','configuracoes',true),
    ('GER','dashboard',true), ('GER','projetos',true), ('GER','relatorios',true), ('GER','auditoria',false), ('GER','pesquisas',true), ('GER','configuracoes',false),
    ('AUD','dashboard',false), ('AUD','projetos',false), ('AUD','relatorios',false), ('AUD','auditoria',true), ('AUD','pesquisas',false), ('AUD','configuracoes',false),
    ('PAT','dashboard',true), ('PAT','projetos',true), ('PAT','relatorios',true), ('PAT','auditoria',false), ('PAT','pesquisas',true), ('PAT','configuracoes',false),
    ('SOL','dashboard',false), ('SOL','projetos',false), ('SOL','relatorios',false), ('SOL','auditoria',false), ('SOL','pesquisas',false), ('SOL','configuracoes',false),
    ('OPR','dashboard',false), ('OPR','projetos',false), ('OPR','relatorios',false), ('OPR','auditoria',false), ('OPR','pesquisas',false), ('OPR','configuracoes',true)
)
INSERT INTO profile_modules (profile_id, module_id, can_view)
SELECT profile_id, module_id, can_view FROM matriz
ON CONFLICT (profile_id, module_id) DO UPDATE
SET can_view = EXCLUDED.can_view;

-- 7) Matriz de permissões por perfil.
WITH matriz(profile_id, permission_id, allowed) AS (
  VALUES
    ('ADM','projeto.visualizar',true), ('ADM','projeto.criar',true), ('ADM','projeto.editar',true), ('ADM','projeto.status',true), ('ADM','projeto.excluir',true), ('ADM','relatorio.visualizar',true), ('ADM','relatorio.exportar',true), ('ADM','auditoria.visualizar',true), ('ADM','pesquisa.visualizar',true), ('ADM','administracao.configurar',true), ('ADM','dashboard.visualizar',true),
    ('GER','projeto.visualizar',true), ('GER','projeto.criar',false), ('GER','projeto.editar',false), ('GER','projeto.status',false), ('GER','projeto.excluir',false), ('GER','relatorio.visualizar',true), ('GER','relatorio.exportar',true), ('GER','auditoria.visualizar',false), ('GER','pesquisa.visualizar',true), ('GER','administracao.configurar',false), ('GER','dashboard.visualizar',true),
    ('AUD','projeto.visualizar',false), ('AUD','projeto.criar',false), ('AUD','projeto.editar',false), ('AUD','projeto.status',false), ('AUD','projeto.excluir',false), ('AUD','relatorio.visualizar',false), ('AUD','relatorio.exportar',false), ('AUD','auditoria.visualizar',true), ('AUD','pesquisa.visualizar',false), ('AUD','administracao.configurar',false), ('AUD','dashboard.visualizar',false),
    ('PAT','projeto.visualizar',true), ('PAT','projeto.criar',false), ('PAT','projeto.editar',false), ('PAT','projeto.status',false), ('PAT','projeto.excluir',false), ('PAT','relatorio.visualizar',true), ('PAT','relatorio.exportar',false), ('PAT','auditoria.visualizar',false), ('PAT','pesquisa.visualizar',true), ('PAT','administracao.configurar',false), ('PAT','dashboard.visualizar',true),
    ('SOL','projeto.visualizar',false), ('SOL','projeto.criar',false), ('SOL','projeto.editar',false), ('SOL','projeto.status',false), ('SOL','projeto.excluir',false), ('SOL','relatorio.visualizar',false), ('SOL','relatorio.exportar',false), ('SOL','auditoria.visualizar',false), ('SOL','pesquisa.visualizar',false), ('SOL','administracao.configurar',false), ('SOL','dashboard.visualizar',false),
    ('OPR','projeto.visualizar',false), ('OPR','projeto.criar',false), ('OPR','projeto.editar',false), ('OPR','projeto.status',false), ('OPR','projeto.excluir',false), ('OPR','relatorio.visualizar',false), ('OPR','relatorio.exportar',false), ('OPR','auditoria.visualizar',false), ('OPR','pesquisa.visualizar',false), ('OPR','administracao.configurar',true), ('OPR','dashboard.visualizar',false)
)
INSERT INTO profile_permissions (profile_id, permission_id, allowed)
SELECT profile_id, permission_id, allowed FROM matriz
ON CONFLICT (profile_id, permission_id) DO UPDATE
SET allowed = EXCLUDED.allowed;

COMMIT;

-- 8) Consultas de validação (somente leitura).
SELECT p.id AS perfil, p.name AS nome, m.name AS modulo, pm.can_view
FROM profiles p
JOIN profile_modules pm ON pm.profile_id = p.id
JOIN modules m ON m.id = pm.module_id
ORDER BY p.id, m.display_order;

SELECT p.id AS perfil, p.name AS nome, pr.id AS permissao, pr.name, pp.allowed
FROM profiles p
JOIN profile_permissions pp ON pp.profile_id = p.id
JOIN permissions pr ON pr.id = pp.permission_id
ORDER BY p.id, pr.module_id, pr.id;
