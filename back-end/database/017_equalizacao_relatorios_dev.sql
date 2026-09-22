-- Equalização parametrizada dos três relatórios para desenvolvimento.
-- Idempotente: pode ser executada mais de uma vez.
BEGIN;

INSERT INTO modules (id, name, route, icon, display_order, active) VALUES
 ('relatorios', 'Relatórios', '/relatorios', 'bar-chart-3', 40, true),
 ('pesquisas', 'Mapa de Acessos', '/pesquisas', 'map', 60, true),
 ('auditoria', 'Logs e Auditoria', '/logs', 'history', 50, true)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, route=EXCLUDED.route, icon=EXCLUDED.icon, display_order=EXCLUDED.display_order, active=true;

INSERT INTO permissions (id, module_id, name, description, active) VALUES
 ('reports.read','relatorios','Consultar relatórios','Consultar e filtrar relatórios parametrizados',true),
 ('reports.export','relatorios','Exportar relatórios','Exportar relatórios em CSV, TXT e PDF',true),
 ('access_map.read','pesquisas','Consultar mapa de acessos','Consultar projetos, grupos, membros, pastas e níveis de acesso',true),
 ('audit.read','auditoria','Consultar auditoria','Consultar logs e eventos de auditoria',true),
 ('audit.export','auditoria','Exportar auditoria','Exportar logs de auditoria em CSV, TXT e PDF',true)
ON CONFLICT (id) DO UPDATE SET module_id=EXCLUDED.module_id, name=EXCLUDED.name, description=EXCLUDED.description, active=true;

INSERT INTO menus (id, module_id, name, route, icon, display_order, active) VALUES
 ('menu-relatorios','relatorios','Relatórios','/relatorios','bar-chart-3',40,true),
 ('menu-acessos','pesquisas','Mapa de Acessos','/pesquisas','map',60,true),
 ('menu-auditoria','auditoria','Logs e Auditoria','/logs','history',50,true)
ON CONFLICT (id) DO UPDATE SET module_id=EXCLUDED.module_id, name=EXCLUDED.name, route=EXCLUDED.route, icon=EXCLUDED.icon, display_order=EXCLUDED.display_order, active=true;

INSERT INTO menu_permissions (menu_id, permission_id, allowed) VALUES
 ('menu-relatorios','reports.read',true), ('menu-acessos','access_map.read',true), ('menu-auditoria','audit.read',true)
ON CONFLICT (menu_id, permission_id) DO UPDATE SET allowed=true;

INSERT INTO profile_modules (profile_id, module_id, can_view)
SELECT p.id, m.id, true FROM profiles p CROSS JOIN modules m
WHERE p.id IN ('ADM','GER','PAT','AUD') AND m.id IN ('relatorios','pesquisas','auditoria')
ON CONFLICT (profile_id, module_id) DO UPDATE SET can_view=true;

INSERT INTO profile_permissions (profile_id, permission_id, allowed)
SELECT p.id, x.permission_id, true FROM profiles p CROSS JOIN (VALUES
 ('relatorio.visualizar'), ('relatorio.exportar'), ('pesquisa.visualizar'), ('auditoria.visualizar')
) AS x(permission_id)
WHERE p.id IN ('ADM','GER','PAT','AUD')
ON CONFLICT (profile_id, permission_id) DO UPDATE SET allowed=true;

INSERT INTO report_types (id, code, name, description, formats, active) VALUES
 ('PROJETOS','projetos','Relatório Executivo de Projetos','Portfólio, status, áreas, gestores e indicadores operacionais.','csv,txt,pdf',true),
 ('ACESSOS','acessos','Mapa de Acessos Científico','Projetos, grupos, membros, pastas e níveis de acesso.','csv,txt,pdf',true),
 ('AUDITORIA','auditoria','Logs de Auditoria','Rastreabilidade de ações, usuários, entidades, resultados e datas.','csv,txt,pdf',true)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, formats=EXCLUDED.formats, active=true;

INSERT INTO schema_migrations (version, description) VALUES ('017','Equalização de relatórios, módulos e permissões em desenvolvimento') ON CONFLICT (version) DO NOTHING;
COMMIT;
