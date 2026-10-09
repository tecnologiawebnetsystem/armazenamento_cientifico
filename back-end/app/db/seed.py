from datetime import UTC, datetime
import hashlib
from uuid import uuid4

from app.modules.catalogs.authorization_models import Permission, ProfileModule, ProfilePermission
from app.modules.catalogs.navigation_models import MenuItem, MenuPermission, Module
from app.modules.catalogs.project_catalog_models import ProjectStatus, ResponsibleArea
from app.modules.catalogs.reporting_models import ReportField, ReportType
from app.modules.projects.member_model import ProjectMember
from app.modules.projects.models import Project
from app.modules.users.models import User
from app.modules.users.profile_model import Profile
from app.modules.auth.models import UserSession

SEED_PERFIS = [
    ("ADM", "administrador", "Administra a plataforma, configura parâmetros e gerencia acessos."),
    ("GER", "Responsável", "Acessa áreas de rede sob sua gestão ou supervisão."),
    ("AUD", "auditor", "Consulta informações e acompanha os registros de auditoria."),
    ("PAT", "patrocinador", "Acompanha resultados e aprova solicitações sob sua responsabilidade."),
    ("SOL", "solicitante", "Solicita acessos e acompanha o andamento das solicitações."),
    ("OPR", "operador", "Acessa exclusivamente as configurações da plataforma."),
]

SEED_MODULES = [
    ("dashboard", "Dashboard", "/dashboard", "layout-dashboard", 1),
    ("projetos", "Área de Rede", "/projetos", "folder", 10),
    ("usuarios", "Usuários", "/usuarios", "users", 20),
    ("relatorios", "Relatórios", "/relatorios", "chart", 30),
    ("auditoria", "Logs e Auditoria", "/logs", "history", 50),
    ("pesquisas", "Mapa de Acessos", "/pesquisas", "search", 60),
    ("configuracoes", "Configurações", "/configuracoes", "settings", 70),
]
SEED_PERMISSIONS = [
    ("projeto.visualizar", "projetos", "Visualizar área de rede"), ("projeto.criar", "projetos", "Criar área de rede"),
    ("projeto.editar", "projetos", "Editar área de rede"), ("projeto.status", "projetos", "Ativar ou desativar área de rede"),
    ("usuario.editar", "usuarios", "Editar usuários e perfis"), ("relatorio.exportar", "relatorios", "Exportar relatórios"),
    ("administracao.configurar", "administracao", "Configurar parâmetros"),
    ("pesquisa.visualizar", "pesquisas", "Visualizar mapa de acessos"),
]
SEED_PERMISSION_MATRIX = {
    "ADM": {permission_id: True for permission_id, _, _ in SEED_PERMISSIONS},
    "GER": {permission_id: permission_id in {"projeto.visualizar", "relatorio.visualizar", "relatorio.exportar", "pesquisa.visualizar", "dashboard.visualizar"} for permission_id, _, _ in SEED_PERMISSIONS},
    "AUD": {permission_id: permission_id == "auditoria.visualizar" for permission_id, _, _ in SEED_PERMISSIONS},
    "PAT": {permission_id: permission_id in {"projeto.visualizar", "relatorio.visualizar", "pesquisa.visualizar", "dashboard.visualizar"} for permission_id, _, _ in SEED_PERMISSIONS},
    "SOL": {permission_id: False for permission_id, _, _ in SEED_PERMISSIONS},
    "OPR": {permission_id: permission_id == "administracao.configurar" for permission_id, _, _ in SEED_PERMISSIONS},
}
SEED_STATUS = [("ATIVO", "ativo", "Ativo", "green", 10, True), ("INATIVO", "inativo", "Inativo", "slate", 20, False), ("CONCLUIDO", "concluido", "Concluído", "blue", 30, False), ("SUSPENSO", "suspenso", "Suspenso", "amber", 40, True)]
SEED_REPORTS = [("PROJETOS", "projetos", "Relatório da área de rede", "csv,xlsx,pdf"), ("ACESSOS", "acessos", "Mapa de acessos", "csv,xlsx,pdf")]
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
    ("projetos-nome", "projetos", "nome", "Área de Rede", "projectName", 10),
    ("projetos-codigo", "projetos", "codigo", "Código", "projectCode", 20),
    ("projetos-area", "projetos", "area", "Área responsável", "area", 30),
    ("projetos-status", "projetos", "status", "Status", "status", 40),
    ("projetos-mapas", "projetos", "mapas", "Mapas", "totalMapas", 50),
    ("projetos-membros", "projetos", "membros", "Membros", "totalMembros", 60),
    ("acessos-usuario", "acessos", "usuario", "Usuário", "userName", 10),
    ("acessos-email", "acessos", "email", "E-mail", "userEmail", 20),
    ("acessos-perfil", "acessos", "perfil", "Perfil", "userRole", 30),
    ("acessos-area", "acessos", "area", "Área", "area", 40),
    ("acessos-projeto", "acessos", "projeto", "Área de Rede", "projectName", 50),
    ("acessos-recurso", "acessos", "recurso", "Recurso", "resourceName", 60),
    ("acessos-tipo", "acessos", "tipo", "Tipo de recurso", "resourceType", 70),
    ("acessos-acesso", "acessos", "acesso", "Nível de acesso", "accessLevel", 80),
    ("acessos-ultima", "acessos", "ultimaVisualizacao", "Última visualização", "lastViewedAt", 90),
    ("acessos-projeto-codigo", "acessos", "projetoCodigo", "Código da área de rede", "projectCode", 100),
    ("acessos-pasta", "acessos", "pasta", "Pasta", "folderName", 110),
    ("acessos-caminho-pasta", "acessos", "caminhoPasta", "Caminho da pasta", "folderPath", 120),
    ("acessos-grupo", "acessos", "grupo", "Grupo de acesso", "groupName", 130),
    ("acessos-permissao", "acessos", "permissao", "Permissão", "permission", 140),
    ("acessos-membro", "acessos", "membro", "Membro", "memberName", 150),
    ("acessos-membro-email", "acessos", "membroEmail", "E-mail do membro", "memberEmail", 160),
    ("acessos-membro-papel", "acessos", "membroPapel", "Papel do membro", "memberRole", 170),
    ("acessos-fonte", "acessos", "fonte", "Fonte da consulta", "source", 180),
    ("acessos-consultado-em", "acessos", "consultadoEm", "Consultado em", "queriedAt", 190),
]
SEED_PROFILE_MODULES = [
    ("ADM", "dashboard", True), ("ADM", "projetos", True), ("ADM", "relatorios", True), ("ADM", "auditoria", True), ("ADM", "pesquisas", True), ("ADM", "configuracoes", True),
    ("GER", "dashboard", True), ("GER", "projetos", True), ("GER", "relatorios", True), ("GER", "auditoria", False), ("GER", "pesquisas", True), ("GER", "configuracoes", False),
    ("AUD", "dashboard", False), ("AUD", "projetos", False), ("AUD", "relatorios", False), ("AUD", "auditoria", True), ("AUD", "pesquisas", False), ("AUD", "configuracoes", False),
    ("PAT", "dashboard", True), ("PAT", "projetos", True), ("PAT", "relatorios", True), ("PAT", "auditoria", False), ("PAT", "pesquisas", True), ("PAT", "configuracoes", False),
    ("SOL", "dashboard", False), ("SOL", "projetos", False), ("SOL", "relatorios", False), ("SOL", "auditoria", False), ("SOL", "pesquisas", False), ("SOL", "configuracoes", False),
    ("OPR", "dashboard", False), ("OPR", "projetos", False), ("OPR", "relatorios", False), ("OPR", "auditoria", False), ("OPR", "pesquisas", False), ("OPR", "configuracoes", True),
]
SEED_MENU_PERMISSIONS = [
    ("menu-dashboard", "dashboard.visualizar"), ("menu-projetos", "projeto.visualizar"),
    ("menu-relatorios", "relatorio.visualizar"), ("menu-auditoria", "auditoria.visualizar"),
    ("menu-pesquisas", "pesquisa.visualizar"), ("menu-configuracoes", "administracao.configurar"),
]
SEED_MENUS = [
    ("menu-dashboard", "dashboard", "Dashboard", "/dashboard", "layout-dashboard", 1),
    ("menu-projetos", "projetos", "Área de Rede", "/projetos", "folder", 10),
    ("menu-usuarios", "usuarios", "Usuários", "/usuarios", "users", 20),
    ("menu-relatorios", "relatorios", "Relatórios", "/relatorios", "chart", 30),
    ("menu-auditoria", "auditoria", "Logs e Auditoria", "/logs", "history", 50),
    ("menu-pesquisas", "pesquisas", "Mapa de Acessos", "/pesquisas", "search", 60),
    ("menu-configuracoes", "configuracoes", "Configurações", "/configuracoes", "settings", 70),
]

SEED_USERS = [("GFZ3", "ADM"), ("GCTL", "ADM"), ("GBTF", "ADM"), ("Y1R9", "GER")]


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
        existing_users = {row.user_id: row for row in (await session.scalars(select(User))).all()}
        now = datetime.now(UTC).replace(tzinfo=None)
        existing_profiles = {row.id: row for row in (await session.scalars(select(Profile))).all()}
        for perfil_id, nome, descricao in SEED_PERFIS:
            profile = existing_profiles.get(perfil_id)
            if profile is None:
                session.add(Profile(id=perfil_id, name=nome, description=descricao, created_at=now))
            else:
                profile.name = nome
                profile.description = descricao
        await session.flush()
        profile_ids = {row.name: row.id for row in (await session.scalars(select(Profile))).all()}
        existing_areas = {row.id for row in (await session.scalars(select(ResponsibleArea))).all()}
        for area_id, name, prefix in SEED_AREAS:
            if area_id not in existing_areas:
                session.add(ResponsibleArea(id=area_id, name=name, prefix=prefix, next_number=1, active=True, created_at=now, updated_at=now))
        await session.flush()
        for module_id, name, route, icon, display_order in SEED_MODULES:
            module = await session.get(Module, module_id)
            if module is None:
                session.add(Module(id=module_id, name=name, route=route, icon=icon, display_order=display_order, active=True))
            else:
                module.name = name
                module.route = route
                module.icon = icon
                module.display_order = display_order
                module.active = True
        await session.flush()
        for permission_id, module_id, name in SEED_PERMISSIONS:
            permission = await session.get(Permission, permission_id)
            if permission is None:
                session.add(Permission(id=permission_id, module_id=module_id, name=name, description=name, active=True))
            else:
                permission.module_id = module_id
                permission.name = name
                permission.description = name
                permission.active = True
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
            menu = await session.get(MenuItem, menu_id)
            if menu is None:
                session.add(MenuItem(id=menu_id, module_id=module_id, name=name, route=route, icon=icon, display_order=order, active=True))
            else:
                menu.module_id = module_id
                menu.name = name
                menu.route = route
                menu.icon = icon
                menu.display_order = order
                menu.active = True
        await session.flush()
        for menu_id, permission_id in SEED_MENU_PERMISSIONS:
            link = await session.get(MenuPermission, {"menu_id": menu_id, "permission_id": permission_id})
            if link is None:
                session.add(MenuPermission(menu_id=menu_id, permission_id=permission_id, allowed=True))
            else:
                link.allowed = True
        for profile_id, module_id, can_view in SEED_PROFILE_MODULES:
            profile_module = await session.get(ProfileModule, {"profile_id": profile_id, "module_id": module_id})
            if profile_module is None:
                session.add(ProfileModule(profile_id=profile_id, module_id=module_id, can_view=can_view))
            else:
                profile_module.can_view = can_view
        await session.flush()
        for profile_id in profile_ids.values():
            for permission_id, _, _ in SEED_PERMISSIONS:
                    profile_code = next((code for code, _, _ in SEED_PERFIS if code == profile_id), profile_id)
                    allowed = SEED_PERMISSION_MATRIX.get(profile_code, {}).get(permission_id, False)
                    profile_permission = await session.get(ProfilePermission, {"profile_id": profile_id, "permission_id": permission_id})
                    if profile_permission is None:
                        session.add(ProfilePermission(profile_id=profile_id, permission_id=permission_id, allowed=allowed))
                    else:
                        profile_permission.allowed = allowed
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

        # Sessões usam o código funcional (GFZE), enquanto usuários legados podem
        # ter armazenado o UUID técnico. Corrige esses registros durante o seed.
        all_users = {row.user_id: row for row in (await session.scalars(select(User))).all()}
        users_by_technical_id = {row.id: row for row in all_users.values()}
        sessions = (await session.scalars(select(UserSession))).all()
        for auth_session in sessions:
            legacy_user = users_by_technical_id.get(auth_session.user_id)
            if legacy_user is not None:
                auth_session.user_id = legacy_user.user_id

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
