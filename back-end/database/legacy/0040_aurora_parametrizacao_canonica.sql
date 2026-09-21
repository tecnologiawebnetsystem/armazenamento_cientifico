-- SIGAC / Aurora PostgreSQL
-- Seed canônico e idempotente de parametrização.
-- Não cria dados transacionais (sessions, activity_logs, access_requests).
BEGIN;

CREATE TABLE IF NOT EXISTS menu_permissions (
  menu_id varchar(80) NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  permission_id varchar(80) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  allowed boolean NOT NULL DEFAULT true,
  PRIMARY KEY (menu_id, permission_id)
);

CREATE TABLE IF NOT EXISTS dashboard_cards (
  id varchar(80) PRIMARY KEY,
  module_id varchar(80) REFERENCES modules(id) ON DELETE SET NULL,
  key varchar(80) NOT NULL UNIQUE,
  title varchar(140) NOT NULL,
  description text NOT NULL DEFAULT '',
  metric_key varchar(80) NOT NULL,
  route varchar(180) NOT NULL DEFAULT '',
  profile_ids text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);

INSERT INTO modules (id, name, route, icon, display_order, active) VALUES
 ('projetos','Projetos','/projetos','folder',10,true),
 ('relatorios','Relatórios','/relatorios','chart',30,true),
 ('auditoria','Logs e Auditoria','/logs','history',50,true),
 ('pesquisas','Pesquisa','/pesquisas','search',60,true)
ON CONFLICT (id) DO UPDATE SET name=excluded.name, route=excluded.route, icon=excluded.icon, display_order=excluded.display_order, active=excluded.active;

INSERT INTO permissions (id,module_id,name,description,active) VALUES
 ('projeto.visualizar','projetos','Visualizar projetos','Visualizar projetos',true),
 ('relatorio.visualizar','relatorios','Visualizar relatórios','Visualizar relatórios',true),
 ('relatorio.exportar','relatorios','Exportar relatórios','Exportar relatórios',true),
 ('auditoria.visualizar','auditoria','Visualizar auditoria','Visualizar logs de auditoria',true),
 ('pesquisa.visualizar','pesquisas','Visualizar pesquisas','Visualizar pesquisas',true)
ON CONFLICT (id) DO UPDATE SET module_id=excluded.module_id, name=excluded.name, description=excluded.description, active=excluded.active;

INSERT INTO menus (id,module_id,parent_id,name,route,icon,display_order,active) VALUES
 ('menu-dashboard',NULL,NULL,'Dashboard','/dashboard','layout-dashboard',1,true),
 ('menu-projetos','projetos',NULL,'Projetos','/projetos','folder',10,true),
 ('menu-relatorios','relatorios',NULL,'Relatórios','/relatorios','chart',30,true),
 ('menu-auditoria','auditoria',NULL,'Logs e Auditoria','/logs','history',50,true),
 ('menu-pesquisas','pesquisas',NULL,'Pesquisa','/pesquisas','search',60,true)
ON CONFLICT (id) DO UPDATE SET module_id=excluded.module_id, parent_id=excluded.parent_id, name=excluded.name, route=excluded.route, icon=excluded.icon, display_order=excluded.display_order, active=excluded.active;

INSERT INTO menu_permissions (menu_id, permission_id, allowed) VALUES
 ('menu-projetos','projeto.visualizar',true),
 ('menu-relatorios','relatorio.visualizar',true),
 ('menu-auditoria','auditoria.visualizar',true),
 ('menu-pesquisas','pesquisa.visualizar',true)
ON CONFLICT (menu_id, permission_id) DO UPDATE SET allowed=excluded.allowed;

INSERT INTO dashboard_cards (id,module_id,key,title,description,metric_key,route,profile_ids,display_order,active) VALUES
 ('dashboard-projetos','projetos','projetos','Projetos','Projetos disponíveis no seu escopo.','total_projetos','/projetos','ADM,GER,AUD,PAT,GES,PAR,VIS',10,true),
 ('dashboard-pendencias','relatorios','pendencias','Pendências','Itens que precisam de atenção.','pendencias','/relatorios','ADM,GER,PAT,GES',20,true),
 ('dashboard-auditoria','auditoria','auditoria','Auditoria','Eventos recentes para acompanhamento.','eventos_auditoria','/logs','ADM,AUD',30,true)
ON CONFLICT (key) DO UPDATE SET module_id=excluded.module_id, title=excluded.title, description=excluded.description, metric_key=excluded.metric_key, route=excluded.route, profile_ids=excluded.profile_ids, display_order=excluded.display_order, active=excluded.active;

INSERT INTO report_types (id,code,name,description,formats,active) VALUES
 ('PROJETOS','projetos','Relatório de projetos','Relatório de projetos','csv,xlsx,pdf',true),
 ('ACESSOS','acessos','Mapa de acessos','Mapa de acessos','csv,xlsx,pdf',true)
ON CONFLICT (id) DO UPDATE SET name=excluded.name, description=excluded.description, formats=excluded.formats, active=excluded.active;

INSERT INTO report_fields (id,report_code,field_key,label,source_key,display_order,active) VALUES
 ('projetos-codigo','projetos','codigo','Código','codigo',10,true),
 ('projetos-nome','projetos','nome','Nome','nome',20,true),
 ('projetos-area','projetos','areaResponsavel','Área responsável','areaResponsavel',30,true),
 ('projetos-status','projetos','status','Status','status',40,true),
 ('projetos-criado-em','projetos','criadoEm','Criado em','criadoEm',50,true),
 ('acessos-usuario','acessos','userName','Usuário','userName',10,true),
 ('acessos-email','acessos','userEmail','E-mail','userEmail',20,true),
 ('acessos-projeto','acessos','projectName','Projeto','projectName',30,true),
 ('acessos-nivel','acessos','accessLevel','Nível de acesso','accessLevel',40,true)
ON CONFLICT (id) DO UPDATE SET label=excluded.label, source_key=excluded.source_key, display_order=excluded.display_order, active=excluded.active;

INSERT INTO profile_modules (profile_id,module_id,can_view)
SELECT p.id, m.id,
  CASE WHEN p.id='ADM' THEN true
       WHEN m.id='auditoria' THEN p.id IN ('AUD','ADM')
       WHEN m.id='relatorios' THEN p.id IN ('GER','AUD','PAT','GES','VIS','ADM')
       WHEN m.id='pesquisas' THEN p.id IN ('PAR','VIS','GER','AUD','PAT','GES','ADM')
       ELSE p.id IN ('GER','AUD','PAT','GES','PAR','VIS','ADM') END
FROM profiles p CROSS JOIN modules m
ON CONFLICT (profile_id,module_id) DO UPDATE SET can_view=excluded.can_view;

INSERT INTO profile_permissions (profile_id,permission_id,allowed)
SELECT p.id, x.permission_id,
  CASE WHEN p.id='ADM' THEN true
       WHEN x.permission_id='projeto.visualizar' THEN p.id IN ('GER','AUD','PAT','GES','PAR','VIS')
       WHEN x.permission_id='relatorio.visualizar' THEN p.id IN ('GER','AUD','PAT','GES','VIS')
       WHEN x.permission_id='relatorio.exportar' THEN p.id IN ('ADM','GER','AUD','GES')
       WHEN x.permission_id='auditoria.visualizar' THEN p.id IN ('ADM','AUD')
       WHEN x.permission_id='pesquisa.visualizar' THEN p.id IN ('ADM','GER','AUD','PAT','GES','PAR','VIS')
       ELSE false END
FROM profiles p CROSS JOIN (VALUES
 ('projeto.visualizar'),('projeto.criar'),('projeto.editar'),('projeto.status'),
 ('usuario.editar'),('relatorio.visualizar'),('relatorio.exportar'),
 ('auditoria.visualizar'),('pesquisa.visualizar'),('administracao.configurar')
) AS x(permission_id)
WHERE EXISTS (SELECT 1 FROM permissions permission WHERE permission.id=x.permission_id)
ON CONFLICT (profile_id,permission_id) DO UPDATE SET allowed=excluded.allowed;

INSERT INTO system_settings (key,value,value_type,description,group_name,active) VALUES
 ('limite_arquivo_mb','100','number','Tamanho máximo de arquivo','arquivos',true),
 ('retencao_logs_dias','365','number','Retenção de auditoria','auditoria',true),
 ('parametrizacao_seed_versao','0040','string','Versão do seed canônico','sistema',true)
ON CONFLICT (key) DO UPDATE SET value=excluded.value, value_type=excluded.value_type, description=excluded.description, group_name=excluded.group_name, active=excluded.active;

INSERT INTO schema_migrations(version) VALUES ('0040_aurora_parametrizacao_canonica') ON CONFLICT DO NOTHING;
COMMIT;
