
\set ON_ERROR_STOP on
BEGIN;

-- ================================================================
-- AUTORIZAÇÃO CENTRALIZADA NO BANCO
-- ================================================================
-- Esta migração não define autorização no front-end.
-- O front-end deve consumir o contexto retornado pela API, que por sua
-- vez deve consultar modules, menus, permissions e suas tabelas de vínculo.
-- IDs e rotas são chaves técnicas; textos e regras ficam parametrizados aqui.

-- 1. Catálogo de módulos
WITH catalog(module_id, module_name, module_route, module_icon, sort_order) AS (
  VALUES
    ('dashboard', 'Dashboard', '/dashboard', 'layout-dashboard', 1),
    ('projetos', 'Área de Rede', '/projetos', 'folder', 10),
    ('relatorios', 'Relatórios', '/relatorios', 'chart', 30),
    ('auditoria', 'Logs e Auditoria', '/logs', 'history', 50),
    ('pesquisas', 'Mapa de Acessos', '/pesquisas', 'search', 60),
    ('configuracoes', 'Configurações', '/configuracoes', 'settings', 70)
)
INSERT INTO modules (id, name, route, icon, display_order, active)
SELECT module_id, module_name, module_route, module_icon, sort_order, true
FROM catalog
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  route = EXCLUDED.route,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  active = true;

-- 2. Catálogo de menus
WITH catalog(menu_id, module_id, menu_name, menu_route, menu_icon, sort_order) AS (
  VALUES
    ('menu-dashboard', 'dashboard', 'Dashboard', '/dashboard', 'layout-dashboard', 1),
    ('menu-projetos', 'projetos', 'Área de Rede', '/projetos', 'folder', 10),
    ('menu-relatorios', 'relatorios', 'Relatórios', '/relatorios', 'chart', 30),
    ('menu-auditoria', 'auditoria', 'Logs e Auditoria', '/logs', 'history', 50),
    ('menu-pesquisas', 'pesquisas', 'Mapa de Acessos', '/pesquisas', 'search', 60),
    ('menu-configuracoes', 'configuracoes', 'Configurações', '/configuracoes', 'settings', 70)
)
INSERT INTO menus (id, module_id, parent_id, name, route, icon, display_order, active)
SELECT menu_id, module_id, NULL, menu_name, menu_route, menu_icon, sort_order, true
FROM catalog
ON CONFLICT (id) DO UPDATE SET
  module_id = EXCLUDED.module_id,
  parent_id = NULL,
  name = EXCLUDED.name,
  route = EXCLUDED.route,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  active = true;

-- 3. Permissões por módulo
WITH catalog(permission_id, module_id, permission_name, permission_description) AS (
  VALUES
    ('projeto.visualizar', 'projetos', 'Visualizar área de rede', 'Consultar áreas de rede autorizadas'),
    ('projeto.criar', 'projetos', 'Criar área de rede', 'Cadastrar uma nova área de rede'),
    ('projeto.editar', 'projetos', 'Editar área de rede', 'Alterar dados de uma área de rede'),
    ('projeto.status', 'projetos', 'Alterar status da área de rede', 'Alterar o status de uma área de rede'),
    ('projeto.excluir', 'projetos', 'Excluir área de rede', 'Excluir uma área de rede'),
    ('relatorio.visualizar', 'relatorios', 'Visualizar relatórios', 'Consultar relatórios autorizados'),
    ('relatorio.exportar', 'relatorios', 'Exportar relatórios', 'Exportar relatórios nos formatos habilitados'),
    ('auditoria.visualizar', 'auditoria', 'Visualizar auditoria', 'Consultar registros de auditoria'),
    ('pesquisa.visualizar', 'pesquisas', 'Visualizar mapa de acessos', 'Consultar o mapa de acessos'),
    ('administracao.configurar', 'configuracoes', 'Configurar administração', 'Gerenciar os catálogos administrativos'),
    ('dashboard.visualizar', 'dashboard', 'Visualizar Dashboard', 'Acessar o Dashboard')
)
INSERT INTO permissions (id, module_id, name, description, active)
SELECT permission_id, module_id, permission_name, permission_description, true
FROM catalog
ON CONFLICT (id) DO UPDATE SET
  module_id = EXCLUDED.module_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  active = true;

-- 4. Cada menu exige a permissão de visualização correspondente
WITH catalog(menu_id, permission_id) AS (
  VALUES
    ('menu-dashboard', 'dashboard.visualizar'),
    ('menu-projetos', 'projeto.visualizar'),
    ('menu-relatorios', 'relatorio.visualizar'),
    ('menu-auditoria', 'auditoria.visualizar'),
    ('menu-pesquisas', 'pesquisa.visualizar'),
    ('menu-configuracoes', 'administracao.configurar')
)
INSERT INTO menu_permissions (menu_id, permission_id, allowed)
SELECT menu_id, permission_id, true FROM catalog
ON CONFLICT (menu_id, permission_id) DO UPDATE SET allowed = EXCLUDED.allowed;

-- 5. Limpa somente vínculos dos catálogos administrados por esta migração.
-- Não remove módulos/permissões criados por outras áreas do sistema.
DELETE FROM profile_modules pm
USING modules m
WHERE pm.module_id = m.id
  AND m.id IN ('dashboard', 'projetos', 'relatorios', 'auditoria', 'pesquisas', 'configuracoes');

DELETE FROM profile_permissions pp
USING permissions p
WHERE pp.permission_id = p.id
  AND p.module_id IN ('dashboard', 'projetos', 'relatorios', 'auditoria', 'pesquisas', 'configuracoes');

-- 6. Alçada de módulos por nome do perfil.
-- O JOIN pelo nome evita depender de IDs diferentes entre ambientes.
WITH matrix(profile_name, module_id, can_view) AS (
  VALUES
    ('administrador', 'dashboard', true), ('administrador', 'projetos', true), ('administrador', 'relatorios', true), ('administrador', 'auditoria', true), ('administrador', 'pesquisas', true), ('administrador', 'configuracoes', false),
    ('gerente', 'dashboard', true), ('gerente', 'projetos', true), ('gerente', 'relatorios', true), ('gerente', 'auditoria', false), ('gerente', 'pesquisas', true), ('gerente', 'configuracoes', false),
    ('auditor', 'dashboard', false), ('auditor', 'projetos', false), ('auditor', 'relatorios', false), ('auditor', 'auditoria', true), ('auditor', 'pesquisas', false), ('auditor', 'configuracoes', false),
    ('patrocinador', 'dashboard', true), ('patrocinador', 'projetos', true), ('patrocinador', 'relatorios', true), ('patrocinador', 'auditoria', false), ('patrocinador', 'pesquisas', true), ('patrocinador', 'configuracoes', false),
    ('solicitante', 'dashboard', false), ('solicitante', 'projetos', false), ('solicitante', 'relatorios', false), ('solicitante', 'auditoria', false), ('solicitante', 'pesquisas', false), ('solicitante', 'configuracoes', false),
    ('operador', 'dashboard', false), ('operador', 'projetos', false), ('operador', 'relatorios', false), ('operador', 'auditoria', false), ('operador', 'pesquisas', false), ('operador', 'configuracoes', true)
)
INSERT INTO profile_modules (profile_id, module_id, can_view)
SELECT pr.id, mx.module_id, mx.can_view
FROM matrix mx
JOIN profiles pr ON lower(trim(pr.name)) = lower(trim(mx.profile_name));

-- 7. Alçada de permissões por nome do perfil.
WITH matrix(profile_name, permission_id, allowed) AS (
  VALUES
    ('administrador', 'projeto.visualizar', true), ('administrador', 'projeto.criar', true), ('administrador', 'projeto.editar', true), ('administrador', 'projeto.status', true), ('administrador', 'projeto.excluir', true), ('administrador', 'relatorio.visualizar', true), ('administrador', 'relatorio.exportar', true), ('administrador', 'auditoria.visualizar', true), ('administrador', 'pesquisa.visualizar', true), ('administrador', 'administracao.configurar', false), ('administrador', 'dashboard.visualizar', true),
    ('gerente', 'projeto.visualizar', true), ('gerente', 'projeto.criar', false), ('gerente', 'projeto.editar', false), ('gerente', 'projeto.status', false), ('gerente', 'projeto.excluir', false), ('gerente', 'relatorio.visualizar', true), ('gerente', 'relatorio.exportar', true), ('gerente', 'auditoria.visualizar', false), ('gerente', 'pesquisa.visualizar', true), ('gerente', 'administracao.configurar', false), ('gerente', 'dashboard.visualizar', true),
    ('auditor', 'projeto.visualizar', false), ('auditor', 'projeto.criar', false), ('auditor', 'projeto.editar', false), ('auditor', 'projeto.status', false), ('auditor', 'projeto.excluir', false), ('auditor', 'relatorio.visualizar', false), ('auditor', 'relatorio.exportar', false), ('auditor', 'auditoria.visualizar', true), ('auditor', 'pesquisa.visualizar', false), ('auditor', 'administracao.configurar', false), ('auditor', 'dashboard.visualizar', false),
    ('patrocinador', 'projeto.visualizar', true), ('patrocinador', 'projeto.criar', false), ('patrocinador', 'projeto.editar', false), ('patrocinador', 'projeto.status', false), ('patrocinador', 'projeto.excluir', false), ('patrocinador', 'relatorio.visualizar', true), ('patrocinador', 'relatorio.exportar', false), ('patrocinador', 'auditoria.visualizar', false), ('patrocinador', 'pesquisa.visualizar', true), ('patrocinador', 'administracao.configurar', false), ('patrocinador', 'dashboard.visualizar', true),
    ('solicitante', 'projeto.visualizar', false), ('solicitante', 'projeto.criar', false), ('solicitante', 'projeto.editar', false), ('solicitante', 'projeto.status', false), ('solicitante', 'projeto.excluir', false), ('solicitante', 'relatorio.visualizar', false), ('solicitante', 'relatorio.exportar', false), ('solicitante', 'auditoria.visualizar', false), ('solicitante', 'pesquisa.visualizar', false), ('solicitante', 'administracao.configurar', false), ('solicitante', 'dashboard.visualizar', false),
    ('operador', 'projeto.visualizar', false), ('operador', 'projeto.criar', false), ('operador', 'projeto.editar', false), ('operador', 'projeto.status', false), ('operador', 'projeto.excluir', false), ('operador', 'relatorio.visualizar', false), ('operador', 'relatorio.exportar', false), ('operador', 'auditoria.visualizar', false), ('operador', 'pesquisa.visualizar', false), ('operador', 'administracao.configurar', true), ('operador', 'dashboard.visualizar', false)
)
INSERT INTO profile_permissions (profile_id, permission_id, allowed)
SELECT pr.id, mx.permission_id, mx.allowed
FROM matrix mx
JOIN profiles pr ON lower(trim(pr.name)) = lower(trim(mx.profile_name));

COMMIT;
