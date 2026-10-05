from datetime import UTC, datetime

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
]
SEED_PERMISSIONS = [
    ("projeto.visualizar", "projetos", "Visualizar projetos"), ("projeto.criar", "projetos", "Criar projetos"),
    ("projeto.editar", "projetos", "Editar projetos"), ("projeto.status", "projetos", "Ativar ou desativar projetos"),
    ("usuario.editar", "usuarios", "Editar usuários e perfis"), ("relatorio.exportar", "relatorios", "Exportar relatórios"),
    ("administracao.configurar", "administracao", "Configurar parâmetros"),
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
SEED_MENUS = [("menu-projetos", "projetos", "Projetos", "/projetos", "folder", 10), ("menu-usuarios", "usuarios", "Usuários", "/usuarios", "users", 20), ("menu-relatorios", "relatorios", "Relatórios", "/relatorios", "chart", 30)]

SEED_USERS = [("GFZ3", "ADM")]

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
                users.append(User(user_id=user_id, profile_id=profile_id, created_at=now))
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
