from datetime import UTC, datetime
import hashlib
from uuid import uuid4

from app.modules.catalogs.authorization_models import Permission, ProfilePermission
from app.modules.catalogs.navigation_models import MenuItem, Module
from app.modules.catalogs.project_catalog_models import ProjectStatus, ResponsibleArea
from app.modules.catalogs.reporting_models import ReportField, ReportType
from app.modules.projects.member_model import ProjectMember
from app.modules.projects.models import Project
from app.modules.users.models import User
from app.modules.users.profile_model import Profile

SEED_PERFIS = [
    ("ADM", "administrador", "Administra a plataforma, configura parâmetros e gerencia acessos."),
    ("GER", "gerente", "Coordena projetos, equipes e atividades operacionais."),
    ("AUD", "auditor", "Consulta informações e acompanha os registros de auditoria."),
    ("PAT", "patrocinador", "Acompanha resultados e aprova solicitações sob sua responsabilidade."),
    ("SOL", "solicitante", "Solicita acessos e acompanha o andamento das solicitações."),
]

SEED_MODULES = [
    ("projetos", "Projetos", "/projetos", "folder", 10), ("usuarios", "Usuários", "/usuarios", "users", 20),
    ("relatorios", "Relatórios", "/relatorios", "chart", 30), ("administracao", "Administração", "/administracao", "settings", 40),
    ("pesquisas", "Mapa de Acessos", "/pesquisas", "search", 60),
]
SEED_PERMISSIONS = [
    ("projeto.visualizar", "projetos", "Visualizar projetos"), ("projeto.criar", "projetos", "Criar projetos"),
    ("projeto.editar", "projetos", "Editar projetos"), ("projeto.status", "projetos", "Ativar ou desativar projetos"),
    ("usuario.editar", "usuarios", "Editar usuários e perfis"), ("relatorio.exportar", "relatorios", "Exportar relatórios"),
    ("administracao.configurar", "administracao", "Configurar parâmetros"),
    ("pesquisa.visualizar", "pesquisas", "Visualizar mapa de acessos"),
]
SEED_STATUS = [("ATIVO", "ativo", "Ativo", "green", 10, True), ("INATIVO", "inativo", "Inativo", "slate", 20, False), ("CONCLUIDO", "concluido", "Concluído", "blue", 30, False), ("SUSPENSO", "suspenso", "Suspenso", "amber", 40, True)]
SEED_REPORTS = [("PROJETOS", "projetos", "Relatório de projetos", "csv,xlsx,pdf"), ("ACESSOS", "acessos", "Mapa de acessos", "csv,xlsx,pdf")]
SEED_AREAS = [
    ("tecnologia-informacao", "Tecnologia da Informação", "TI"),
    ("governanca-compliance", "Governança e Compliance", "GC"),
    ("gestao-documental", "Gestão Documental", "GD"),
    ("pesquisa-desenvolvimento", "Pesquisa e Desenvolvimento", "PD"),
    ("engenharia", "Engenharia", "ENG"),
    ("pesquisa", "Pesquisa", "PES"),
    ("operacoes", "Operações", "OP"),
    ("documentacao", "Documentação", "DOC"),
    ("tecnologia", "Tecnologia", "TEC"),
]
SEED_REPORT_FIELDS = [
    ("projetos-nome", "projetos", "nome", "Nome do projeto", "projectName", 10),
    ("projetos-codigo", "projetos", "codigo", "Código", "projectCode", 20),
    ("projetos-area", "projetos", "area", "Área responsável", "area", 30),
    ("projetos-status", "projetos", "status", "Status", "status", 40),
    ("projetos-mapas", "projetos", "mapas", "Mapas", "totalMapas", 50),
    ("projetos-membros", "projetos", "membros", "Membros", "totalMembros", 60),
    ("acessos-usuario", "acessos", "usuario", "Usuário", "userName", 10),
    ("acessos-email", "acessos", "email", "E-mail", "userEmail", 20),
    ("acessos-perfil", "acessos", "perfil", "Perfil", "userRole", 30),
    ("acessos-area", "acessos", "area", "Área", "area", 40),
    ("acessos-projeto", "acessos", "projeto", "Projeto", "projectName", 50),
    ("acessos-recurso", "acessos", "recurso", "Recurso", "resourceName", 60),
    ("acessos-tipo", "acessos", "tipo", "Tipo de recurso", "resourceType", 70),
    ("acessos-acesso", "acessos", "acesso", "Nível de acesso", "accessLevel", 80),
    ("acessos-ultima", "acessos", "ultimaVisualizacao", "Última visualização", "lastViewedAt", 90),
]
SEED_MENUS = [("menu-projetos", "projetos", "Projetos", "/projetos", "folder", 10), ("menu-usuarios", "usuarios", "Usuários", "/usuarios", "users", 20), ("menu-relatorios", "relatorios", "Relatórios", "/relatorios", "chart", 30), ("menu-pesquisas", "pesquisas", "Mapa de Acessos", "/pesquisas", "search", 60)]

SEED_USERS = [("GFZ3", "ADM")]


SEED_SQL_SCRIPTS = [
    """
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
        ('projeto.criar', 'projetos', 'Criar projetos', 'Criar projetos', true),
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
        """,
    """
        INSERT INTO users (user_id, profile_id)
        SELECT 'GFZ3', p.id
        FROM profiles p
        WHERE upper(p.name) = 'ADMINISTRADOR'
        ON CONFLICT (user_id) DO UPDATE
        SET profile_id = EXCLUDED.profile_id;

        INSERT INTO users (user_id, profile_id)
        SELECT 'GCTL', p.id
        FROM profiles p
        WHERE upper(p.name) = 'ADMINISTRADOR'
        ON CONFLICT (user_id) DO UPDATE
        SET profile_id = EXCLUDED.profile_id;

        INSERT INTO users (user_id, profile_id)
        SELECT 'GBTF', p.id
        FROM profiles p
        WHERE upper(p.name) = 'ADMINISTRADOR'
        ON CONFLICT (user_id) DO UPDATE
        SET profile_id = EXCLUDED.profile_id;

        INSERT INTO users (user_id, profile_id)
        SELECT 'Y1R9', p.id
        FROM profiles p
        WHERE upper(p.name) = 'GERENTE'
        ON CONFLICT (user_id) DO UPDATE
        SET profile_id = EXCLUDED.profile_id;
        """,
]

SEED_PROJECTS = [
    ("SIGAC Modernização", "SIGAC-001", "Tecnologia da Informação", "Projeto de modernização do acervo científico e dos fluxos de consulta.", "ativo"),
    ("Governança de Dados", "GOV-002", "Governança e Compliance", "Padronização de políticas, acessos e trilhas de auditoria.", "ativo"),
    ("Migração do Acervo 2025", "MIG-003", "Gestão Documental", "Projeto histórico para validação de filtros e relatórios.", "concluido"),
    ("Portal de Pesquisa", "PES-004", "Pesquisa e Desenvolvimento", "Projeto arquivado para testar inativação e filtros de status.", "inativo"),
]

async def initialize_database(engine) -> None:
    # O schema deve existir exclusivamente via Alembic antes da execução deste seed.

    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import async_sessionmaker

    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        from sqlalchemy import text

        for script in SEED_SQL_SCRIPTS:
            for statement in script.split(";"):
                statement = statement.strip()
                if statement:
                    await session.execute(text(statement))
        await session.flush()
        existing_users = {row.user_id: row for row in (await session.scalars(select(User))).all()}
        now = datetime.now(UTC).replace(tzinfo=None)
        existing_profiles = {row.id for row in (await session.scalars(select(Profile))).all()}
        for perfil_id, nome, descricao in SEED_PERFIS:
            if perfil_id not in existing_profiles:
                session.add(Profile(id=perfil_id, name=nome, description=descricao, created_at=now))
        await session.flush()
        profile_ids = {row.name: row.id for row in (await session.scalars(select(Profile))).all()}
        existing_areas = {row.id for row in (await session.scalars(select(ResponsibleArea))).all()}
        for area_id, name, prefix in SEED_AREAS:
            if area_id not in existing_areas:
                session.add(ResponsibleArea(id=area_id, name=name, prefix=prefix, next_number=1, active=True, created_at=now, updated_at=now))
        await session.flush()
        for item in SEED_MODULES:
            if not await session.get(Module, item[0]):
                session.add(Module(id=item[0], name=item[1], route=item[2], icon=item[3], display_order=item[4], active=True))
        await session.flush()
        for permission_id, module_id, name in SEED_PERMISSIONS:
            if not await session.get(Permission, permission_id):
                session.add(Permission(id=permission_id, module_id=module_id, name=name, description=name, active=True))
        for status_id, code, name, color, order, editable in SEED_STATUS:
            if not await session.get(ProjectStatus, status_id):
                session.add(ProjectStatus(id=status_id, code=code, name=name, color=color, display_order=order, active=True, allows_edit=editable))

        for report_id, code, name, formats in SEED_REPORTS:
            if not await session.get(ReportType, report_id):
                session.add(ReportType(id=report_id, code=code, name=name, description=name, formats=formats, active=True))
        for field_id, report_code, field_key, label, source_key, display_order in SEED_REPORT_FIELDS:
            if not await session.get(ReportField, field_id):
                session.add(ReportField(id=field_id, report_code=report_code, field_key=field_key, label=label, source_key=source_key, display_order=display_order, active=True))

        for menu_id, module_id, name, route, icon, order in SEED_MENUS:
            if not await session.get(MenuItem, menu_id):
                session.add(MenuItem(id=menu_id, module_id=module_id, name=name, route=route, icon=icon, display_order=order, active=True))
        await session.flush()
        for profile_id in profile_ids.values():
            for permission_id, _, _ in SEED_PERMISSIONS:
                    if not await session.get(ProfilePermission, {"profile_id": profile_id, "permission_id": permission_id}):
                        session.add(ProfilePermission(profile_id=profile_id, permission_id=permission_id, allowed=(profile_id == "ADM" or permission_id.endswith(".visualizar"))) )
        users = []
        seed_users = SEED_USERS
        for user_id, profile_id in seed_users:
            user = existing_users.get(user_id)
            if user is None:
                users.append(User(id=hashlib.md5(user_id.encode("utf-8"), usedforsecurity=False).hexdigest(), user_id=user_id, profile_id=profile_id, created_at=now))
            else:
                user.profile_id = profile_id
        session.add_all(users)
        await session.flush()

        all_users = {row.user_id: row for row in (await session.scalars(select(User))).all()}
        admin = all_users[SEED_USERS[0][0]]
        manager = admin
        auditor = admin

        existing_codes = {row.code for row in (await session.scalars(select(Project))).all()}
        projects = []
        seed_projects = SEED_PROJECTS
        seed_users_for_projects = list(all_users.values())
        for index, (name, code, area, description, status) in enumerate(seed_projects, start=1):
            participant_ids = [person.id for person in seed_users_for_projects[:min(4, len(seed_users_for_projects))]]
            manager_ids = [admin.id, manager.id]
            if code not in existing_codes:
                project = Project(
                    id=str(uuid4()), name=name, code=code,
                    responsible_area=area, managers_ids=manager_ids,
                    write_group="SIGAC-Escrita", read_group="SIGAC-Leitura",
                    write_identity_role="administrador", read_identity_role="consultor",
                    snow_task_number=f"TASK{1000 + index}", parent_folder=f"/Projetos/{code}",
                    description=description, status=status,
                    participants_ids=participant_ids,
                    created_at=now, updated_at=now,
                )
                projects.append(project)
        session.add_all(projects)
        await session.flush()

        all_projects = {row.code: row for row in (await session.scalars(select(Project))).all()}
        for project in all_projects.values():
            for member, papel in ((admin, "administrador"), (manager, "gerente"), (auditor, "auditor")):
                if not await session.get(ProjectMember, {"project_id": project.id, "user_id": member.id}):
                    session.add(ProjectMember(project_id=project.id, user_id=member.id, role=papel, created_at=now))
        await session.flush()

        await session.commit()

__all__ = ["initialize_database"]
