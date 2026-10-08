\set ON_ERROR_STOP on
BEGIN;

-- 1. Perfis
INSERT INTO profiles (id, name, description, created_at) VALUES
('ADM', 'administrador', 'Administra a plataforma, configura parâmetros e gerencia acessos.', '2026-09-25 16:19:00.534-03'),
('GER', 'gerente', 'Coordena projetos, equipes e atividades operacionais.', '2026-09-25 16:19:00.534-03'),
('AUD', 'auditor', 'Consulta informações e acompanha registros de auditoria.', '2026-09-25 16:19:00.534-03'),
('PAT', 'patrocinador', 'Acompanha resultados e aprova solicitações.', '2026-09-25 16:19:00.534-03'),
('SOL', 'solicitante', 'Solicita acessos e acompanha solicitações.', '2026-09-25 16:19:00.534-03'),
('OPR', 'operador', 'Acessa exclusivamente o menu Configurações.', '2026-10-02 11:25:51.173-03')
ON CONFLICT (id) DO UPDATE SET name = excluded.name, description = excluded.description;

-- 2. Módulos
INSERT INTO modules (id, name, route, icon, display_order, active) VALUES
('dashboard', 'Dashboard', '/dashboard', 'layout-dashboard', 1, true),
('projetos', 'Projetos', '/projetos', 'folder', 10, true),
('relatorios', 'Relatórios', '/relatorios', 'chart', 30, true),
('auditoria', 'Logs e Auditoria', '/logs', 'history', 50, true),
('pesquisas', 'Mapa de Acessos', '/pesquisas', 'search', 60, true),
('configuracoes', 'Configurações', '/configuracoes', 'settings', 70, true)
ON CONFLICT (id) DO UPDATE SET name = excluded.name, route = excluded.route, icon = excluded.icon, display_order = excluded.display_order, active = excluded.active;

-- 3. Áreas responsáveis
INSERT INTO responsible_areas (id, name, prefix, next_number, active, created_at, updated_at) VALUES
('tecnologia', 'Tecnologia', 'TEC', 1, true, '2026-09-25 16:20:25.992-03', '2026-09-25 16:20:25.992-03'),
('pesquisa', 'Pesquisa', 'PES', 1, true, '2026-09-25 16:20:25.992-03', '2026-09-25 16:20:25.992-03'),
('engenharia', 'Engenharia', 'ENG', 1, true, '2026-09-25 16:20:25.992-03', '2026-09-25 16:20:25.992-03'),
('operacoes', 'Operações', 'OP', 1, true, '2026-09-25 16:20:25.992-03', '2026-09-25 16:20:25.992-03'),
('governanca-compliance', 'Governança e Compliance', 'GC', 1, true, '2026-09-25 16:20:25.992-03', '2026-09-25 16:20:25.992-03'),
('documentacao', 'Documentação', 'DOC', 1, true, '2026-09-25 16:20:25.992-03', '2026-09-25 16:20:25.992-03')
ON CONFLICT (id) DO UPDATE SET name = excluded.name, prefix = excluded.prefix, next_number = excluded.next_number, active = excluded.active, updated_at = excluded.updated_at;

-- 4. Status de projetos
INSERT INTO project_statuses (id, code, name, color, display_order, active, allows_edit) VALUES
('ativo', 'ativo', 'Ativo', 'green', 10, true, true),
('em-implantacao', 'em_implantacao', 'Em implantação', 'blue', 20, true, true),
('pausado', 'pausado', 'Pausado', 'amber', 30, true, true),
('encerrado', 'encerrado', 'Encerrado', 'slate', 40, true, true)
ON CONFLICT (id) DO UPDATE SET code = excluded.code, name = excluded.name, color = excluded.color, display_order = excluded.display_order, active = excluded.active, allows_edit = excluded.allows_edit;

-- 5. Tipos de relatório
INSERT INTO report_types (id, code, name, description, formats, active) VALUES
('PROJETOS', 'projetos', 'Relatório Executivo de Projetos', 'Portfólio, status, áreas, gestores e indicadores.', 'csv,txt,pdf', true),
('ACESSOS', 'acessos', 'Mapa de Acessos Científico', 'Projetos, grupos, membros, pastas e níveis de acesso.', 'csv,txt,pdf', true),
('AUDITORIA', 'auditoria', 'Logs de Auditoria', 'Rastreabilidade de ações, usuários, entidades e resultados.', 'csv,txt,pdf', true)
ON CONFLICT (id) DO UPDATE SET code = excluded.code, name = excluded.name, description = excluded.description, formats = excluded.formats, active = excluded.active;

-- 6. Campos dos relatórios
INSERT INTO report_fields (id, report_code, field_key, label, source_key, display_order, active) VALUES
('projetos-codigo', 'projetos', 'codigo', 'Código', 'codigo', 10, true),
('projetos-nome', 'projetos', 'nome', 'Projeto', 'nome', 20, true),
('projetos-area', 'projetos', 'areaResponsavel', 'Área responsável', 'areaResponsavel', 30, true),
('projetos-status', 'projetos', 'status', 'Status', 'status', 40, true),
('projetos-gestores', 'projetos', 'gestoresIds', 'Gestores', 'gestoresIds', 50, true),
('projetos-membros', 'projetos', 'totalMembros', 'Total de membros', 'totalMembros', 60, true),
('projetos-criado', 'projetos', 'criadoEm', 'Criado em', 'criadoEm', 70, true),
('projetos-atualizado', 'projetos', 'atualizadoEm', 'Atualizado em', 'atualizadoEm', 80, true),
('acessos-usuario-id', 'acessos', 'userId', 'Identificador do usuário', 'userId', 10, true),
('acessos-usuario', 'acessos', 'userName', 'Membro', 'userName', 20, true),
('acessos-email', 'acessos', 'userEmail', 'E-mail', 'userEmail', 30, true),
('acessos-perfil', 'acessos', 'userRole', 'Perfil', 'userRole', 40, true),
('acessos-area', 'acessos', 'area', 'Área', 'area', 50, true),
('acessos-projeto-id', 'acessos', 'projectId', 'Identificador do projeto', 'projectId', 60, true),
('acessos-projeto', 'acessos', 'projectName', 'Projeto', 'projectName', 70, true),
('acessos-status', 'acessos', 'projectStatus', 'Status do projeto', 'projectStatus', 80, true),
('acessos-recurso', 'acessos', 'resourceName', 'Recurso', 'resourceName', 90, true),
('acessos-tipo', 'acessos', 'resourceType', 'Tipo de recurso', 'resourceType', 100, true),
('acessos-atualizacao', 'acessos', 'lastViewedAt', 'Último acesso', 'lastViewedAt', 110, true),
('auditoria-id', 'auditoria', 'id', 'Identificador', 'id', 10, true),
('auditoria-data', 'auditoria', 'criadoEm', 'Data e hora', 'criadoEm', 20, true),
('auditoria-usuario', 'auditoria', 'userName', 'Usuário', 'userName', 30, true),
('auditoria-email', 'auditoria', 'userEmail', 'E-mail', 'userEmail', 40, true),
('auditoria-acao', 'auditoria', 'acao', 'Ação', 'acao', 50, true),
('auditoria-entidade', 'auditoria', 'entidade', 'Entidade', 'entidade', 60, true),
('auditoria-entidade-id', 'auditoria', 'entidadeId', 'Identificador da entidade', 'entidadeId', 70, true),
('auditoria-resultado', 'auditoria', 'resultado', 'Resultado', 'resultado', 80, true),
('auditoria-detalhes', 'auditoria', 'detalhes', 'Detalhes', 'detalhes', 90, true)
ON CONFLICT (id) DO UPDATE SET report_code = excluded.report_code, field_key = excluded.field_key, label = excluded.label, source_key = excluded.source_key, display_order = excluded.display_order, active = excluded.active;

-- 7. Permissões
INSERT INTO permissions (id, module_id, name, description, active) VALUES
('projeto.visualizar', 'projetos', 'Visualizar projetos', 'Visualizar projetos', true),
('projeto.criar', 'projetos', 'Criar área de rede', 'Criar área de rede', true),
('projeto.editar', 'projetos', 'Editar projetos', 'Editar projetos', true),
('projeto.status', 'projetos', 'Alterar status', 'Alterar status de projetos', true),
('projeto.excluir', 'projetos', 'Excluir projetos', 'Excluir projetos', true),
('relatorio.visualizar', 'relatorios', 'Visualizar relatórios', 'Visualizar relatórios', true),
('relatorio.exportar', 'relatorios', 'Exportar relatórios', 'Exportar CSV, TXT e PDF', true),
('auditoria.visualizar', 'auditoria', 'Visualizar auditoria', 'Visualizar logs de auditoria', true),
('pesquisa.visualizar', 'pesquisas', 'Visualizar mapa de acessos', 'Consultar projetos, grupos, membros, pastas e níveis', true),
('administracao.configurar', 'configuracoes', 'Configurar administração', 'Editar módulos, menus, permissões, perfis e relatórios', true),
('dashboard.visualizar', 'dashboard', 'Visualizar Dashboard', 'Acessar o Dashboard da plataforma', true)
ON CONFLICT (id) DO UPDATE SET module_id = excluded.module_id, name = excluded.name, description = excluded.description, active = excluded.active;

-- 8. Menus
INSERT INTO menus (id, module_id, parent_id, name, route, icon, display_order, active) VALUES
('menu-projetos', 'projetos', NULL, 'Projetos', '/projetos', 'folder', 10, true),
('menu-relatorios', 'relatorios', NULL, 'Relatórios', '/relatorios', 'chart', 30, true),
('menu-auditoria', 'auditoria', NULL, 'Logs e Auditoria', '/logs', 'history', 50, true),
('menu-pesquisas', 'pesquisas', NULL, 'Mapa de Acessos', '/pesquisas', 'search', 60, true),
('menu-configuracoes', 'configuracoes', NULL, 'Configurações', '/configuracoes', 'settings', 70, true),
('menu-dashboard', 'dashboard', NULL, 'Dashboard', '/dashboard', 'layout-dashboard', 1, true)
ON CONFLICT (id) DO UPDATE SET module_id = excluded.module_id, parent_id = excluded.parent_id, name = excluded.name, route = excluded.route, icon = excluded.icon, display_order = excluded.display_order, active = excluded.active;

-- 9. Vínculos entre menus e permissões
INSERT INTO menu_permissions (menu_id, permission_id, allowed) VALUES
('menu-projetos', 'projeto.visualizar', true),
('menu-relatorios', 'relatorio.visualizar', true),
('menu-auditoria', 'auditoria.visualizar', true),
('menu-pesquisas', 'pesquisa.visualizar', true),
('menu-configuracoes', 'administracao.configurar', true),
('menu-dashboard', 'dashboard.visualizar', true)
ON CONFLICT (menu_id, permission_id) DO UPDATE SET allowed = excluded.allowed;

-- 10. Visibilidade dos módulos por perfil
INSERT INTO profile_modules (profile_id, module_id, can_view) VALUES
('ADM', 'projetos', true), ('ADM', 'relatorios', true), ('ADM', 'auditoria', true), ('ADM', 'pesquisas', true), ('ADM', 'configuracoes', false), ('ADM', 'dashboard', true),
('GER', 'projetos', true), ('GER', 'relatorios', true), ('GER', 'auditoria', false), ('GER', 'pesquisas', true), ('GER', 'configuracoes', false), ('GER', 'dashboard', true),
('AUD', 'projetos', false), ('AUD', 'relatorios', false), ('AUD', 'auditoria', true), ('AUD', 'pesquisas', false), ('AUD', 'configuracoes', false), ('AUD', 'dashboard', false),
('PAT', 'projetos', true), ('PAT', 'relatorios', true), ('PAT', 'auditoria', false), ('PAT', 'pesquisas', true), ('PAT', 'configuracoes', false), ('PAT', 'dashboard', true),
('SOL', 'projetos', false), ('SOL', 'relatorios', false), ('SOL', 'auditoria', false), ('SOL', 'pesquisas', false), ('SOL', 'configuracoes', false), ('SOL', 'dashboard', false),
('OPR', 'projetos', false), ('OPR', 'relatorios', false), ('OPR', 'auditoria', false), ('OPR', 'pesquisas', false), ('OPR', 'configuracoes', true), ('OPR', 'dashboard', false)
ON CONFLICT (profile_id, module_id) DO UPDATE SET can_view = excluded.can_view;

-- 11. Permissões por perfil
INSERT INTO profile_permissions (profile_id, permission_id, allowed) VALUES
('ADM', 'projeto.visualizar', true), ('ADM', 'projeto.criar', true), ('ADM', 'projeto.editar', true), ('ADM', 'projeto.status', true), ('ADM', 'projeto.excluir', true), ('ADM', 'relatorio.visualizar', true), ('ADM', 'relatorio.exportar', true), ('ADM', 'auditoria.visualizar', true), ('ADM', 'pesquisa.visualizar', true), ('ADM', 'administracao.configurar', false), ('ADM', 'dashboard.visualizar', true),
('GER', 'projeto.visualizar', true), ('GER', 'projeto.criar', false), ('GER', 'projeto.editar', false), ('GER', 'projeto.status', false), ('GER', 'projeto.excluir', false), ('GER', 'relatorio.visualizar', true), ('GER', 'relatorio.exportar', true), ('GER', 'auditoria.visualizar', false), ('GER', 'pesquisa.visualizar', true), ('GER', 'administracao.configurar', false), ('GER', 'dashboard.visualizar', true),
('AUD', 'projeto.visualizar', false), ('AUD', 'projeto.criar', false), ('AUD', 'projeto.editar', false), ('AUD', 'projeto.status', false), ('AUD', 'projeto.excluir', false), ('AUD', 'relatorio.visualizar', false), ('AUD', 'relatorio.exportar', false), ('AUD', 'auditoria.visualizar', true), ('AUD', 'pesquisa.visualizar', false), ('AUD', 'administracao.configurar', false), ('AUD', 'dashboard.visualizar', false),
('PAT', 'projeto.visualizar', true), ('PAT', 'projeto.criar', false), ('PAT', 'projeto.editar', false), ('PAT', 'projeto.status', false), ('PAT', 'projeto.excluir', false), ('PAT', 'relatorio.visualizar', true), ('PAT', 'relatorio.exportar', false), ('PAT', 'auditoria.visualizar', false), ('PAT', 'pesquisa.visualizar', true), ('PAT', 'administracao.configurar', false), ('PAT', 'dashboard.visualizar', true),
('SOL', 'projeto.visualizar', false), ('SOL', 'projeto.criar', false), ('SOL', 'projeto.editar', false), ('SOL', 'projeto.status', false), ('SOL', 'projeto.excluir', false), ('SOL', 'relatorio.visualizar', false), ('SOL', 'relatorio.exportar', false), ('SOL', 'auditoria.visualizar', false), ('SOL', 'pesquisa.visualizar', false), ('SOL', 'administracao.configurar', false), ('SOL', 'dashboard.visualizar', false),
('OPR', 'projeto.visualizar', false), ('OPR', 'projeto.criar', false), ('OPR', 'projeto.editar', false), ('OPR', 'projeto.status', false), ('OPR', 'projeto.excluir', false), ('OPR', 'relatorio.visualizar', false), ('OPR', 'relatorio.exportar', false), ('OPR', 'auditoria.visualizar', false), ('OPR', 'pesquisa.visualizar', false), ('OPR', 'administracao.configurar', true), ('OPR', 'dashboard.visualizar', false)
ON CONFLICT (profile_id, permission_id) DO UPDATE SET allowed = excluded.allowed;

COMMIT;

