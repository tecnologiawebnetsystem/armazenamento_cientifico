-- SIGAC / NBIC
-- Migration 018: equalização final de módulos, menus, permissões, perfis e relatórios.
-- Executar após 017_equalizacao_relatorios_dev.sql em banco existente.
-- Idempotente; não remove dados transacionais.
\set ON_ERROR_STOP on
BEGIN;

-- Módulos oficiais das três áreas.
INSERT INTO modules (id, name, route, icon, display_order, active) VALUES
 ('relatorios', 'Relatórios', '/relatorios', 'chart', 30, true),
 ('auditoria', 'Logs e Auditoria', '/logs', 'history', 50, true),
 ('pesquisas', 'Mapa de Acessos', '/pesquisas', 'search', 60, true)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, route=EXCLUDED.route, icon=EXCLUDED.icon, display_order=EXCLUDED.display_order, active=true;

-- Permissões canônicas do baseline.
INSERT INTO permissions (id, module_id, name, description, active) VALUES
 ('relatorio.visualizar', 'relatorios', 'Visualizar relatórios', 'Visualizar, filtrar e selecionar campos de relatórios.', true),
 ('relatorio.exportar', 'relatorios', 'Exportar relatórios', 'Exportar relatórios parametrizados em CSV, TXT e PDF.', true),
 ('auditoria.visualizar', 'auditoria', 'Visualizar auditoria', 'Consultar logs e eventos de auditoria.', true),
 ('pesquisa.visualizar', 'pesquisas', 'Visualizar mapa de acessos', 'Consultar projetos, grupos, membros, pastas e níveis de acesso.', true)
ON CONFLICT (id) DO UPDATE SET module_id=EXCLUDED.module_id, name=EXCLUDED.name, description=EXCLUDED.description, active=true;

-- Menus visíveis e vinculados aos módulos.
INSERT INTO menus (id, module_id, parent_id, name, route, icon, display_order, active) VALUES
 ('menu-relatorios', 'relatorios', NULL, 'Relatórios', '/relatorios', 'chart', 30, true),
 ('menu-auditoria', 'auditoria', NULL, 'Logs e Auditoria', '/logs', 'history', 50, true),
 ('menu-pesquisas', 'pesquisas', NULL, 'Mapa de Acessos', '/pesquisas', 'search', 60, true)
ON CONFLICT (id) DO UPDATE SET module_id=EXCLUDED.module_id, parent_id=EXCLUDED.parent_id, name=EXCLUDED.name, route=EXCLUDED.route, icon=EXCLUDED.icon, display_order=EXCLUDED.display_order, active=true;

INSERT INTO menu_permissions (menu_id, permission_id, allowed) VALUES
 ('menu-relatorios', 'relatorio.visualizar', true),
 ('menu-auditoria', 'auditoria.visualizar', true),
 ('menu-pesquisas', 'pesquisa.visualizar', true)
ON CONFLICT (menu_id, permission_id) DO UPDATE SET allowed=true;

-- Perfis funcionais: visualização/exportação conforme responsabilidade.
INSERT INTO profile_modules (profile_id, module_id, can_view)
SELECT p.id, x.module_id, x.can_view
FROM profiles p
CROSS JOIN (VALUES
 ('relatorios', true), ('auditoria', false), ('pesquisas', true)
) AS x(module_id, can_view)
WHERE p.id IN ('ADM','GER','AUD','PAT')
ON CONFLICT (profile_id, module_id) DO UPDATE SET can_view=EXCLUDED.can_view;

UPDATE profile_modules SET can_view=true WHERE profile_id='ADM' AND module_id IN ('relatorios','auditoria','pesquisas');
UPDATE profile_modules SET can_view=true WHERE profile_id='AUD' AND module_id IN ('relatorios','auditoria','pesquisas');

INSERT INTO profile_permissions (profile_id, permission_id, allowed)
SELECT p.id, x.permission_id, x.allowed
FROM profiles p
CROSS JOIN (VALUES
 ('relatorio.visualizar', true), ('relatorio.exportar', false),
 ('auditoria.visualizar', false), ('pesquisa.visualizar', true)
) AS x(permission_id, allowed)
WHERE p.id IN ('ADM','GER','AUD','PAT')
ON CONFLICT (profile_id, permission_id) DO UPDATE SET allowed=EXCLUDED.allowed;

UPDATE profile_permissions SET allowed=true WHERE profile_id='ADM' AND permission_id IN ('relatorio.visualizar','relatorio.exportar','auditoria.visualizar','pesquisa.visualizar');
UPDATE profile_permissions SET allowed=true WHERE profile_id='GER' AND permission_id IN ('relatorio.visualizar','relatorio.exportar','pesquisa.visualizar');
UPDATE profile_permissions SET allowed=true WHERE profile_id='AUD' AND permission_id IN ('relatorio.visualizar','relatorio.exportar','auditoria.visualizar','pesquisa.visualizar');

-- Catálogo oficial dos três relatórios e formatos suportados pela aplicação.
INSERT INTO report_types (id, code, name, description, formats, active) VALUES
 ('PROJETOS','projetos','Relatório Executivo de Projetos','Portfólio, status, áreas, gestores, governança e indicadores operacionais.','csv,txt,pdf',true),
 ('ACESSOS','acessos','Mapa de Acessos Científico','Projetos, grupos, membros, pastas e níveis de acesso autorizados.','csv,txt,pdf',true),
 ('AUDITORIA','auditoria','Logs de Auditoria','Rastreabilidade de ações, usuários, entidades, resultados e datas.','csv,txt,pdf',true)
ON CONFLICT (id) DO UPDATE SET code=EXCLUDED.code, name=EXCLUDED.name, description=EXCLUDED.description, formats=EXCLUDED.formats, active=true;

-- Campos de projetos.
INSERT INTO report_fields (id, report_code, field_key, label, source_key, display_order, active) VALUES
 ('projetos-id','projetos','id','Identificador','id',10,true),
 ('projetos-codigo','projetos','codigo','Código','codigo',20,true),
 ('projetos-nome','projetos','nome','Nome do projeto','nome',30,true),
 ('projetos-area','projetos','areaResponsavel','Área responsável','areaResponsavel',40,true),
 ('projetos-status','projetos','status','Status','status',50,true),
 ('projetos-descricao','projetos','descricao','Descrição','descricao',60,true),
 ('projetos-gestores','projetos','gestoresIds','Gestores','gestoresIds',70,true),
 ('projetos-grupo-escrita','projetos','grupoAdEscrita','Grupo Azure AD de escrita','grupoAdEscrita',80,true),
 ('projetos-grupo-leitura','projetos','grupoAdLeitura','Grupo Azure AD de leitura','grupoAdLeitura',90,true),
 ('projetos-role-escrita','projetos','roleIdentidadeEscrita','Role de identidade de escrita','roleIdentidadeEscrita',100,true),
 ('projetos-role-leitura','projetos','roleIdentidadeLeitura','Role de identidade de leitura','roleIdentidadeLeitura',110,true),
 ('projetos-tarefa-snow','projetos','numeroTarefaSnow','Número da tarefa Snow','numeroTarefaSnow',120,true),
 ('projetos-pasta-mae','projetos','pastaMae','Pasta mãe','pastaMae',130,true),
 ('projetos-total-mapas','projetos','totalMapas','Total de mapas','totalMapas',140,true),
 ('projetos-total-membros','projetos','totalMembros','Total de membros','totalMembros',150,true),
 ('projetos-criado-em','projetos','criadoEm','Criado em','criadoEm',160,true),
 ('projetos-atualizado-em','projetos','atualizadoEm','Atualizado em','atualizadoEm',170,true)
ON CONFLICT (id) DO UPDATE SET label=EXCLUDED.label, source_key=EXCLUDED.source_key, display_order=EXCLUDED.display_order, active=true;

-- Campos de mapa de acessos.
INSERT INTO report_fields (id, report_code, field_key, label, source_key, display_order, active) VALUES
 ('acessos-usuario-id','acessos','userId','Identificador do usuário','userId',10,true),
 ('acessos-usuario','acessos','userName','Membro','userName',20,true),
 ('acessos-email','acessos','userEmail','E-mail','userEmail',30,true),
 ('acessos-perfil','acessos','userRole','Perfil','userRole',40,true),
 ('acessos-area','acessos','area','Área','area',50,true),
 ('acessos-projeto-id','acessos','projectId','Identificador do projeto','projectId',60,true),
 ('acessos-projeto','acessos','projectName','Projeto','projectName',70,true),
 ('acessos-status-projeto','acessos','projectStatus','Status do projeto','projectStatus',80,true),
 ('acessos-recurso-id','acessos','resourceId','Identificador do recurso','resourceId',90,true),
 ('acessos-recurso','acessos','resourceName','Recurso','resourceName',100,true),
 ('acessos-tipo-recurso','acessos','resourceType','Tipo de recurso','resourceType',110,true),
 ('acessos-nivel','acessos','accessLevel','Nível de acesso','accessLevel',120,true),
 ('acessos-ultima-visualizacao','acessos','lastViewedAt','Última visualização','lastViewedAt',130,true),
 ('acessos-atualizado-em','acessos','updatedAt','Atualizado em','updatedAt',140,true)
ON CONFLICT (id) DO UPDATE SET label=EXCLUDED.label, source_key=EXCLUDED.source_key, display_order=EXCLUDED.display_order, active=true;

-- Campos de auditoria. Resultado/detalhes ficam configuráveis quando existirem no schema de eventos.
INSERT INTO report_fields (id, report_code, field_key, label, source_key, display_order, active) VALUES
 ('auditoria-id','auditoria','id','Identificador do evento','id',10,true),
 ('auditoria-data','auditoria','criadoEm','Data e hora','criadoEm',20,true),
 ('auditoria-usuario-id','auditoria','userId','Identificador do usuário','userId',30,true),
 ('auditoria-usuario','auditoria','userName','Usuário','userName',40,true),
 ('auditoria-email','auditoria','userEmail','E-mail','userEmail',50,true),
 ('auditoria-acao','auditoria','acao','Ação','acao',60,true),
 ('auditoria-entidade','auditoria','entidade','Entidade','entidade',70,true),
 ('auditoria-entidade-id','auditoria','entidadeId','Identificador da entidade','entidadeId',80,true),
 ('auditoria-detalhes','auditoria','detalhes','Detalhes','detalhes',90,true)
ON CONFLICT (id) DO UPDATE SET label=EXCLUDED.label, source_key=EXCLUDED.source_key, display_order=EXCLUDED.display_order, active=true;

INSERT INTO schema_migrations (version)
VALUES ('018_equalizacao_parametrizacao_final')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- Validação recomendada:
-- SELECT code, name, formats, active FROM report_types ORDER BY code;
-- SELECT report_code, count(*) AS campos_ativos FROM report_fields WHERE active GROUP BY report_code ORDER BY report_code;
-- SELECT id, module_id, active FROM permissions WHERE module_id IN ('relatorios','pesquisas','auditoria') ORDER BY module_id, id;
-- SELECT id, module_id, name, route, active FROM menus WHERE module_id IN ('relatorios','pesquisas','auditoria') ORDER BY display_order;
-- SELECT profile_id, module_id, can_view FROM profile_modules WHERE module_id IN ('relatorios','pesquisas','auditoria') ORDER BY profile_id, module_id;
-- SELECT profile_id, permission_id, allowed FROM profile_permissions WHERE permission_id IN ('relatorio.visualizar','relatorio.exportar','auditoria.visualizar','pesquisa.visualizar') ORDER BY profile_id, permission_id;
