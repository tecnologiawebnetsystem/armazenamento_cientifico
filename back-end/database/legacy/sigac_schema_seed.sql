-- SIGAC - estrutura e carga inicial do banco PostgreSQL/Aurora
-- Uso: execute no DBeaver conectado ao banco correto.
-- Este script é idempotente para a estrutura e para os dados de referência.
-- Ele representa a primeira fase: pastas são apenas metadados/listagem;
-- não são criados arquivos nem operações de upload/download.
-- Recomenda-se executar em transação e validar em homologação antes da produção.

BEGIN;

CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE IF NOT EXISTS profiles (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS modules (
    id VARCHAR(80) PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    route VARCHAR(180) NOT NULL DEFAULT '',
    icon VARCHAR(80) NOT NULL DEFAULT 'folder',
    display_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(80) PRIMARY KEY,
    module_id VARCHAR(80) NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS profile_permissions (
    profile_id VARCHAR(20) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    permission_id VARCHAR(80) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    allowed BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (profile_id, permission_id)
);

CREATE TABLE IF NOT EXISTS profile_modules (
    profile_id VARCHAR(20) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    module_id VARCHAR(80) NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    can_view BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (profile_id, module_id)
);

CREATE TABLE IF NOT EXISTS menus (
    id VARCHAR(80) PRIMARY KEY,
    module_id VARCHAR(80) REFERENCES modules(id) ON DELETE SET NULL,
    parent_id VARCHAR(80),
    name VARCHAR(120) NOT NULL,
    route VARCHAR(180) NOT NULL DEFAULT '',
    icon VARCHAR(80) NOT NULL DEFAULT 'circle',
    display_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(320) NOT NULL UNIQUE,
    job_title VARCHAR(120),
    area VARCHAR(120),
    avatar_url VARCHAR(500),
    last_login_at TIMESTAMP,
    role VARCHAR(40) NOT NULL DEFAULT 'participante',
    profile_id VARCHAR(20) REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    cav4_subject VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS ix_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS responsible_areas (
    id VARCHAR(40) PRIMARY KEY,
    name VARCHAR(160) NOT NULL UNIQUE,
    prefix VARCHAR(20) NOT NULL UNIQUE,
    next_number INTEGER NOT NULL DEFAULT 1,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS project_statuses (
    id VARCHAR(40) PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT 'slate',
    display_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    allows_edit BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS project_types (
    id VARCHAR(40) PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    responsible_area VARCHAR(160) NOT NULL,
    managers_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    write_group VARCHAR(160) NOT NULL DEFAULT '',
    read_group VARCHAR(160) NOT NULL DEFAULT '',
    write_identity_role VARCHAR(160) NOT NULL DEFAULT '',
    read_identity_role VARCHAR(160) NOT NULL DEFAULT '',
    snow_task_number VARCHAR(120) NOT NULL DEFAULT '',
    parent_folder VARCHAR(500) NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    status VARCHAR(30) NOT NULL DEFAULT 'ativo',
    participants_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS project_members (
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(40) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS folders (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id),
    parent_id VARCHAR(36) REFERENCES folders(id) ON DELETE CASCADE,
    kind VARCHAR(20) NOT NULL,
    name VARCHAR(500) NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    mime_type VARCHAR(160),
    created_by VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS report_types (
    id VARCHAR(60) PRIMARY KEY,
    code VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    formats TEXT NOT NULL DEFAULT 'csv',
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS report_fields (
    id VARCHAR(60) PRIMARY KEY,
    report_code VARCHAR(60) NOT NULL REFERENCES report_types(code) ON DELETE CASCADE,
    field_key VARCHAR(100) NOT NULL,
    label VARCHAR(160) NOT NULL,
    source_key VARCHAR(160) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(120) PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    value_type VARCHAR(30) NOT NULL DEFAULT 'string',
    description TEXT NOT NULL DEFAULT '',
    group_name VARCHAR(80) NOT NULL DEFAULT 'geral',
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS access_requests (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    requester_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL,
    request_type VARCHAR(40) NOT NULL DEFAULT 'geral',
    requested_role VARCHAR(40) NOT NULL DEFAULT '',
    justification VARCHAR(2000) NOT NULL DEFAULT '',
    servicenow_ticket VARCHAR(120),
    updated_at TIMESTAMP NOT NULL,
    analyzed_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(36),
    details TEXT NOT NULL DEFAULT '',
    result VARCHAR(30) NOT NULL DEFAULT 'success',
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);
CREATE INDEX IF NOT EXISTS ix_users_profile_id ON users(profile_id);
CREATE INDEX IF NOT EXISTS ix_projects_code ON projects(code);
CREATE INDEX IF NOT EXISTS ix_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS ix_folders_project_id ON folders(project_id);
CREATE INDEX IF NOT EXISTS ix_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS ix_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS ix_activity_logs_project_id ON activity_logs(project_id);
CREATE INDEX IF NOT EXISTS ix_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS ix_activity_logs_entity ON activity_logs(entity);
CREATE INDEX IF NOT EXISTS ix_activity_logs_created_at ON activity_logs(created_at);

-- Perfis
INSERT INTO profiles (id, name, description, created_at) VALUES
('ADM','administrador','Acesso total à plataforma', CURRENT_TIMESTAMP),
('GER','gerente','Gestão operacional de projetos', CURRENT_TIMESTAMP),
('AUD','auditor','Consulta e auditoria', CURRENT_TIMESTAMP),
('PAT','patrocinador','Acompanhamento e aprovação', CURRENT_TIMESTAMP),
('PAR','participante','Participação em projetos', CURRENT_TIMESTAMP),
('VIS','visualizador','Acesso somente leitura', CURRENT_TIMESTAMP),
('SOL','solicitante','Solicitação e acompanhamento de acessos', CURRENT_TIMESTAMP),
('GES','gestor','Gestão de projeto', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description;

-- Módulos, permissões e menus
INSERT INTO modules (id,name,route,icon,display_order,active) VALUES
('projetos','Projetos','/projetos','folder',10,TRUE),
('usuarios','Usuários','/usuarios','users',20,TRUE),
('relatorios','Relatórios','/relatorios','chart',30,TRUE),
('administracao','Administração','/administracao','settings',40,TRUE)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, route=EXCLUDED.route, icon=EXCLUDED.icon, display_order=EXCLUDED.display_order, active=EXCLUDED.active;

INSERT INTO permissions (id,module_id,name,description,active) VALUES
('projeto.visualizar','projetos','Visualizar projetos','Visualizar projetos',TRUE),
('projeto.criar','projetos','Criar projetos','Criar projetos',TRUE),
('projeto.editar','projetos','Editar projetos','Editar projetos',TRUE),
('projeto.status','projetos','Ativar ou desativar projetos','Ativar ou desativar projetos',TRUE),
('usuario.editar','usuarios','Editar usuários e perfis','Editar usuários e perfis',TRUE),
('relatorio.exportar','relatorios','Exportar relatórios','Exportar relatórios',TRUE),
('administracao.configurar','administracao','Configurar parâmetros','Configurar parâmetros',TRUE)
ON CONFLICT (id) DO UPDATE SET module_id=EXCLUDED.module_id, name=EXCLUDED.name, description=EXCLUDED.description, active=EXCLUDED.active;

INSERT INTO menus (id,module_id,name,route,icon,display_order,active) VALUES
('menu-projetos','projetos','Projetos','/projetos','folder',10,TRUE),
('menu-usuarios','usuarios','Usuários','/usuarios','users',20,TRUE),
('menu-relatorios','relatorios','Relatórios','/relatorios','chart',30,TRUE)
ON CONFLICT (id) DO UPDATE SET module_id=EXCLUDED.module_id, name=EXCLUDED.name, route=EXCLUDED.route, icon=EXCLUDED.icon, display_order=EXCLUDED.display_order, active=EXCLUDED.active;

INSERT INTO profile_permissions (profile_id,permission_id,allowed)
SELECT p.id, x.permission_id, (p.id='ADM' OR x.permission_id='projeto.visualizar')
FROM profiles p CROSS JOIN (VALUES
('projeto.visualizar'),('projeto.criar'),('projeto.editar'),('projeto.status'),
('usuario.editar'),('relatorio.exportar'),('administracao.configurar')) AS x(permission_id)
ON CONFLICT (profile_id,permission_id) DO UPDATE SET allowed=EXCLUDED.allowed;

INSERT INTO profile_modules (profile_id,module_id,can_view)
SELECT p.id,m.id,(p.id IN ('ADM','GER','AUD','PAT','GES'))
FROM profiles p CROSS JOIN modules m
ON CONFLICT (profile_id,module_id) DO UPDATE SET can_view=EXCLUDED.can_view;

-- Catálogos
INSERT INTO project_statuses (id,code,name,color,display_order,active,allows_edit) VALUES
('ATIVO','ativo','Ativo','green',10,TRUE,TRUE),
('INATIVO','inativo','Inativo','slate',20,TRUE,FALSE),
('CONCLUIDO','concluido','Concluído','blue',30,TRUE,FALSE),
('SUSPENSO','suspenso','Suspenso','amber',40,TRUE,TRUE)
ON CONFLICT (id) DO UPDATE SET code=EXCLUDED.code,name=EXCLUDED.name,color=EXCLUDED.color,display_order=EXCLUDED.display_order,active=EXCLUDED.active,allows_edit=EXCLUDED.allows_edit;

INSERT INTO project_types (id,code,name,description,active) VALUES
('CIENTIFICO','cientifico','Científico','Projetos científicos',TRUE),
('TECNOLOGIA','tecnologia','Tecnologia','Projetos de tecnologia',TRUE)
ON CONFLICT (id) DO UPDATE SET code=EXCLUDED.code,name=EXCLUDED.name,description=EXCLUDED.description,active=EXCLUDED.active;

INSERT INTO report_types (id,code,name,description,formats,active) VALUES
('PROJETOS','projetos','Relatório de projetos','Relatório de projetos','csv,xlsx,pdf',TRUE),
('ACESSOS','acessos','Mapa de acessos','Mapa de acessos','csv,xlsx,pdf',TRUE)
ON CONFLICT (id) DO UPDATE SET code=EXCLUDED.code,name=EXCLUDED.name,description=EXCLUDED.description,formats=EXCLUDED.formats,active=EXCLUDED.active;

INSERT INTO responsible_areas (id,name,prefix,next_number,active,created_at,updated_at) VALUES
('tecnologia-informacao','Tecnologia da Informação','TI',1,TRUE,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('governanca-compliance','Governança e Compliance','GC',1,TRUE,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('gestao-documental','Gestão Documental','GD',1,TRUE,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pesquisa-desenvolvimento','Pesquisa e Desenvolvimento','PD',1,TRUE,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('engenharia','Engenharia','ENG',1,TRUE,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pesquisa','Pesquisa','PES',1,TRUE,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('operacoes','Operações','OP',1,TRUE,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('documentacao','Documentação','DOC',1,TRUE,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tecnologia','Tecnologia','TEC',1,TRUE,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,prefix=EXCLUDED.prefix,active=EXCLUDED.active,updated_at=CURRENT_TIMESTAMP;

INSERT INTO system_settings (key,value,value_type,description,group_name,active) VALUES
('limite_arquivo_mb','100','number','Tamanho máximo de arquivo','arquivos',TRUE),
('retencao_logs_dias','365','number','Retenção de auditoria','auditoria',TRUE)
ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value,value_type=EXCLUDED.value_type,description=EXCLUDED.description,group_name=EXCLUDED.group_name,active=EXCLUDED.active;

-- Usuários administradores iniciais; o vínculo definitivo de papel deve ser confirmado pelo CAV4.
INSERT INTO users (id,name,email,role,profile_id,created_at) VALUES
('seed-admin-kleber','Kleber Goncalves','kleber.goncalves.prestserv@petrobras.com.br','administrador','ADM',CURRENT_TIMESTAMP),
('seed-admin-fabio-junior','Fabio Junior','fabio.j.lima.prestserv@petrobras.com.br','administrador','ADM',CURRENT_TIMESTAMP),
('seed-admin-jefferson','Jefferson Breno','jefferson.breno.prestserv@petrobras.com.br','administrador','ADM',CURRENT_TIMESTAMP),
('seed-admin-raisa','Raisa Cananeia','raisa.moreira.prestserv@petrobras.com.br','administrador','ADM',CURRENT_TIMESTAMP),
('seed-admin-wagner','Wagner Gaspar Brazil','wagner.brazil@petrobras.com.br','administrador','ADM',CURRENT_TIMESTAMP),
('seed-admin-jose','Jose Elisio Balouta de Almeida Ribeiro','jose.balouta.prestserv@petrobras.com.br','administrador','ADM',CURRENT_TIMESTAMP),
('seed-admin-jairo','Jairo Farias das Neves','jairo.farias@petrobras.com.br','administrador','ADM',CURRENT_TIMESTAMP),
('seed-admin-fabio-carvalho','Fabio Rodrigues de Carvalho','fabio_carvalho.prestserv@petrobras.com.br','administrador','ADM',CURRENT_TIMESTAMP)
ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name,role=EXCLUDED.role,profile_id=EXCLUDED.profile_id;

COMMIT;

-- Verificação rápida após a execução:
-- SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;
-- SELECT name,email,role,profile_id FROM users ORDER BY name;
-- SELECT current_database(),current_user,current_schema();
