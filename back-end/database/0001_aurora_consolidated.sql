-- SIGAC / PostgreSQL Aurora
-- MIGRATION CONSOLIDADA OFICIAL
-- Execute uma única vez em banco novo ou controlado.
-- Não executar os arquivos em database/legacy/ após este arquivo.

\set ON_ERROR_STOP on
BEGIN;

-- 01 schema base
-- Fonte histórica consolidada: back-end/database/postgresql-schema.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS schema_migrations (version varchar(80) PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS profiles (id varchar(20) PRIMARY KEY, name varchar(80) NOT NULL UNIQUE, description varchar(255) NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS users (id varchar(36) PRIMARY KEY, name varchar(200) NOT NULL, email varchar(320) NOT NULL UNIQUE, job_title varchar(120), area varchar(120), role varchar(40) NOT NULL DEFAULT 'solicitante', profile_id varchar(20) REFERENCES profiles(id) ON DELETE SET NULL, avatar_url varchar(500), last_login_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS modules (id varchar(80) PRIMARY KEY, name varchar(120) NOT NULL UNIQUE, route varchar(180) NOT NULL DEFAULT '', icon varchar(80) NOT NULL DEFAULT 'folder', display_order integer NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true);
CREATE TABLE IF NOT EXISTS permissions (id varchar(80) PRIMARY KEY, module_id varchar(80) NOT NULL REFERENCES modules(id) ON DELETE CASCADE, name varchar(120) NOT NULL, description text NOT NULL DEFAULT '', active boolean NOT NULL DEFAULT true);
CREATE TABLE IF NOT EXISTS profile_permissions (profile_id varchar(20) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, permission_id varchar(80) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE, allowed boolean NOT NULL DEFAULT true, PRIMARY KEY (profile_id, permission_id));
CREATE TABLE IF NOT EXISTS profile_modules (profile_id varchar(20) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, module_id varchar(80) NOT NULL REFERENCES modules(id) ON DELETE CASCADE, can_view boolean NOT NULL DEFAULT true, PRIMARY KEY (profile_id, module_id));
CREATE TABLE IF NOT EXISTS project_statuses (id varchar(40) PRIMARY KEY, code varchar(40) NOT NULL UNIQUE, name varchar(100) NOT NULL, color varchar(20) NOT NULL DEFAULT 'slate', display_order integer NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true, allows_edit boolean NOT NULL DEFAULT true);
CREATE TABLE IF NOT EXISTS project_types (id varchar(40) PRIMARY KEY, code varchar(40) NOT NULL UNIQUE, name varchar(100) NOT NULL, description text NOT NULL DEFAULT '', active boolean NOT NULL DEFAULT true);
CREATE TABLE IF NOT EXISTS report_types (id varchar(60) PRIMARY KEY, code varchar(60) NOT NULL UNIQUE, name varchar(120) NOT NULL, description text NOT NULL DEFAULT '', formats text NOT NULL DEFAULT 'csv', active boolean NOT NULL DEFAULT true);
CREATE TABLE IF NOT EXISTS report_fields (id varchar(60) PRIMARY KEY, report_code varchar(60) NOT NULL REFERENCES report_types(code) ON DELETE CASCADE, field_key varchar(100) NOT NULL, label varchar(160) NOT NULL, source_key varchar(160) NOT NULL, display_order integer NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true, UNIQUE (report_code, field_key));
CREATE TABLE IF NOT EXISTS menus (id varchar(80) PRIMARY KEY, module_id varchar(80) REFERENCES modules(id) ON DELETE SET NULL, parent_id varchar(80), name varchar(120) NOT NULL, route varchar(180) NOT NULL DEFAULT '', icon varchar(80) NOT NULL DEFAULT 'circle', display_order integer NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true);
CREATE TABLE IF NOT EXISTS projects (id varchar(36) PRIMARY KEY, name varchar(200) NOT NULL, code varchar(50) NOT NULL UNIQUE, responsible_area varchar(160) NOT NULL, managers_ids jsonb NOT NULL DEFAULT '[]', write_group varchar(160) NOT NULL DEFAULT '', read_group varchar(160) NOT NULL DEFAULT '', write_identity_role varchar(160) NOT NULL DEFAULT '', read_identity_role varchar(160) NOT NULL DEFAULT '', snow_task_number varchar(120) NOT NULL DEFAULT '', parent_folder varchar(500) NOT NULL DEFAULT '', description text NOT NULL DEFAULT '', status varchar(30) NOT NULL DEFAULT 'ativo', participants_ids jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS project_members (project_id varchar(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE, user_id varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE, role varchar(40) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (project_id, user_id));
CREATE TABLE IF NOT EXISTS folders (id varchar(36) PRIMARY KEY, project_id varchar(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE, parent_id varchar(36) REFERENCES folders(id) ON DELETE CASCADE, kind varchar(20) NOT NULL DEFAULT 'pasta' CHECK (kind = 'pasta'), name varchar(500) NOT NULL, size_bytes bigint NOT NULL DEFAULT 0, mime_type varchar(160), created_by varchar(36) NOT NULL REFERENCES users(id) ON DELETE RESTRICT, last_viewed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS access_requests (id varchar(36) PRIMARY KEY, project_id varchar(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE, requester_id varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE, status varchar(30) NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS activity_logs (id varchar(36) PRIMARY KEY, user_id varchar(36) REFERENCES users(id) ON DELETE SET NULL, action varchar(100) NOT NULL, entity varchar(100) NOT NULL, entity_id varchar(36), details text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email); CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status); CREATE INDEX IF NOT EXISTS idx_folders_project_parent ON folders(project_id,parent_id); CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC); CREATE INDEX IF NOT EXISTS idx_access_requests_project ON access_requests(project_id); 

-- 02 subject CAV4
-- Fonte histórica consolidada: back-end/database/migrations/0016_add_cav4_subject_to_sessions.sql
-- SIGAC migration 0016
-- Persiste somente o subject/identificador técnico retornado pelo CAV4
-- na sessão autenticada. Não cria nem persiste papéis, grupos ou permissões CAV4.

ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS cav4_subject VARCHAR(255);

COMMENT ON COLUMN sessions.cav4_subject IS
    'Identificador técnico (subject) retornado pelo CAV4 para a sessão autenticada; não representa papel, grupo ou permissão.';

-- Rollback manual, se necessário:
-- ALTER TABLE sessions DROP COLUMN IF EXISTS cav4_subject;

-- 03 sessões de autenticação
-- Fonte histórica consolidada: back-end/database/migrations/0020_restore_auth_sessions.sql
-- BEGIN removido: transação controlada pela migration consolidada.

CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(36) NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(320) NOT NULL,
    profile_id VARCHAR(20) NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    expires_at TIMESTAMP NOT NULL,
    cav4_subject VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE sessions ALTER COLUMN user_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS ix_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS ix_sessions_expires_at ON sessions(expires_at);

-- COMMIT removido: transação controlada pela migration consolidada.

-- Validação:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'sessions' ORDER BY ordinal_position;

-- 04 parametrização estrutural
-- Fonte histórica consolidada: back-end/database/0023_parametrizacao_completa.sql
-- Parametrização de menus e dashboard. Executar no Aurora/PostgreSQL.

CREATE TABLE IF NOT EXISTS menu_permissions (
  menu_id VARCHAR(80) NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  permission_id VARCHAR(80) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  allowed BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (menu_id, permission_id)
);

CREATE TABLE IF NOT EXISTS dashboard_cards (
  id VARCHAR(80) PRIMARY KEY,
  module_id VARCHAR(80) REFERENCES modules(id) ON DELETE SET NULL,
  key VARCHAR(80) NOT NULL UNIQUE,
  title VARCHAR(140) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  metric_key VARCHAR(80) NOT NULL,
  route VARCHAR(180) NOT NULL DEFAULT '',
  profile_ids TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS ix_dashboard_cards_module_id ON dashboard_cards(module_id);

INSERT INTO dashboard_cards (id, key, title, description, metric_key, route, profile_ids, display_order)
VALUES
 ('dashboard-projetos','projetos','Projetos','Projetos disponíveis no seu escopo.','total_projetos','/projetos','admin,gerente,patrocinador,auditor',10),
 ('dashboard-pendencias','pendencias','Pendências','Itens que precisam de atenção.','pendencias','/relatorios','admin,gerente',20),
 ('dashboard-auditoria','auditoria','Auditoria','Eventos recentes para acompanhamento.','eventos_auditoria','/logs','admin,auditor',30)
ON CONFLICT (key) DO NOTHING;

-- 05 seed canônico
-- Perfis funcionais e suas descrições de apresentação.
INSERT INTO profiles (id, name, description)
VALUES
 ('ADM','administrador','Administra a plataforma, configura parâmetros e gerencia acessos.'),
 ('GER','gerente','Coordena projetos, equipes e atividades operacionais.'),
 ('AUD','auditor','Consulta informações e acompanha os registros de auditoria.'),
 ('PAT','patrocinador','Acompanha resultados e aprova solicitações sob sua responsabilidade.'),
 ('SOL','solicitante','Solicita acessos e acompanha o andamento das solicitações.')
ON CONFLICT (id) DO UPDATE SET name=excluded.name, description=excluded.description;

-- Fonte histórica consolidada: back-end/database/0040_aurora_parametrizacao_canonica.sql
-- SIGAC / Aurora PostgreSQL
-- Seed canônico e idempotente de parametrização.
-- Não cria dados transacionais (sessions, activity_logs, access_requests).
-- BEGIN removido: transação controlada pela migration consolidada.

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
 ('projeto.criar','projetos','Criar projetos','Criar projetos',true),
 ('projeto.editar','projetos','Editar projetos','Editar projetos',true),
 ('projeto.status','projetos','Alterar status de projetos','Alterar status de projetos',true),
 ('projeto.excluir','projetos','Excluir projetos','Excluir projetos',true),
 ('usuario.editar','projetos','Gerenciar usuários','Gerenciar usuários',true),
 ('administracao.configurar','projetos','Configurar administração','Configurar administração',true),
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
 ('dashboard-projetos','projetos','projetos','Projetos','Projetos disponíveis no seu escopo.','total_projetos','/projetos','ADM,GER,AUD,PAT',10,true),
 ('dashboard-pendencias','relatorios','pendencias','Pendências','Itens que precisam de atenção.','pendencias','/relatorios','ADM,GER,PAT',20,true),
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
       WHEN m.id='relatorios' THEN p.id IN ('GER','AUD','PAT','ADM')
       WHEN m.id='pesquisas' THEN p.id IN ('GER','AUD','PAT','ADM')
       ELSE p.id IN ('GER','AUD','PAT','ADM') END
FROM profiles p CROSS JOIN modules m
ON CONFLICT (profile_id,module_id) DO UPDATE SET can_view=excluded.can_view;

INSERT INTO profile_permissions (profile_id,permission_id,allowed)
SELECT p.id, x.permission_id,
  CASE WHEN p.id='ADM' THEN true
       WHEN x.permission_id='projeto.visualizar' THEN p.id IN ('GER','AUD','PAT')
       WHEN x.permission_id='relatorio.visualizar' THEN p.id IN ('GER','AUD','PAT')
       WHEN x.permission_id='relatorio.exportar' THEN p.id IN ('ADM','GER')
       WHEN x.permission_id='auditoria.visualizar' THEN p.id IN ('ADM','AUD')
       WHEN x.permission_id='pesquisa.visualizar' THEN p.id IN ('ADM','GER','AUD','PAT')
       ELSE false END
FROM profiles p CROSS JOIN (VALUES
 ('projeto.visualizar'),('projeto.criar'),('projeto.editar'),('projeto.status'),
 ('usuario.editar'),('relatorio.visualizar'),('relatorio.exportar'),
 ('auditoria.visualizar'),('pesquisa.visualizar'),('administracao.configurar')
) AS x(permission_id)
WHERE EXISTS (SELECT 1 FROM permissions permission WHERE permission.id=x.permission_id)
ON CONFLICT (profile_id,permission_id) DO UPDATE SET allowed=excluded.allowed;


-- COMMIT removido: transação controlada pela migration consolidada.

INSERT INTO schema_migrations(version) VALUES ('0001_aurora_consolidated') ON CONFLICT DO NOTHING;
COMMIT;
