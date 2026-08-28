from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import text

from app.db.base import Base
from app.modules.audit.models import ActivityLog
from app.modules.files.models import File, FileShare
from app.modules.files.permissions_model import FilePermission
from app.modules.projects.member_model import ProjectMember
from app.modules.projects.models import Project
from app.modules.users.models import User
from app.modules.users.profile_model import Perfil
from app.modules.catalogs.models import Module, Permission, ProfileModule, ProfilePermission, ProjectStatusCatalog, ProjectType, ReportType, SystemSetting, MenuItem

SEED_PERFIS = [
    ("ADM", "administrador", "Acesso total à plataforma"),
    ("GER", "gerente", "Gestão operacional de projetos"),
    ("AUD", "auditor", "Consulta e auditoria"),
    ("PAT", "patrocinador", "Acompanhamento e aprovação"),
    ("PAR", "participante", "Participação em projetos"),
    ("VIS", "visualizador", "Acesso somente leitura"),
    ("GES", "gestor", "Gestão de projeto"),
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
SEED_TYPES = [("CIENTIFICO", "cientifico", "Científico", "Projetos científicos"), ("TECNOLOGIA", "tecnologia", "Tecnologia", "Projetos de tecnologia")]
SEED_REPORTS = [("PROJETOS", "projetos", "Relatório de projetos", "csv,xlsx,pdf"), ("ACESSOS", "acessos", "Mapa de acessos", "csv,xlsx,pdf")]
SEED_SETTINGS = [("limite_arquivo_mb", "100", "number", "Tamanho máximo de arquivo", "arquivos"), ("retencao_logs_dias", "365", "number", "Retenção de auditoria", "auditoria")]
SEED_MENUS = [("menu-projetos", "projetos", "Projetos", "/projetos", "folder", 10), ("menu-usuarios", "usuarios", "Usuários", "/usuarios", "users", 20), ("menu-relatorios", "relatorios", "Relatórios", "/relatorios", "chart", 30)]

SEED_USERS = [
    ("Kleber Goncalves", "kleber.goncalves.prestserv@petrobras.com.br", "administrador"),
    ("Fabio Junior", "fabio.j.lima.prestserv@petrobras.com.br", "gerente"),
    ("Jefferson Breno", "jefferson.breno.prestserv@petrobras.com.br", "auditor"),
    ("Raisa Cananeia", "raisa.moreira.prestserv@petrobras.com.br", "patrocinador"),
]

SEED_PROJECTS = [
    ("SIGAC Modernização", "SIGAC-001", "Tecnologia da Informação", "Projeto de modernização do acervo científico e dos fluxos de consulta.", "ativo"),
    ("Governança de Dados", "GOV-002", "Governança e Compliance", "Padronização de políticas, acessos e trilhas de auditoria.", "ativo"),
    ("Migração do Acervo 2025", "MIG-003", "Gestão Documental", "Projeto histórico para validação de filtros e relatórios.", "concluido"),
    ("Portal de Pesquisa", "PES-004", "Pesquisa e Desenvolvimento", "Projeto arquivado para testar inativação e filtros de status.", "inativo"),
]

# Massa inicial: dados fixos tornam o seed repetível e auditável.
SEED_DEMO_USERS = [
    (f"Usuário Demonstração {index:02d}", f"demo.usuario{index:02d}@sigac.local", ("gerente", "auditor", "consultor")[index % 3])
    for index in range(1, 13)
]
SEED_DEMO_PROJECTS = [
    (f"Projeto de Apresentação {index:02d}", f"DEMO-{index:03d}",
     ("Engenharia", "Pesquisa", "Operações", "Documentação", "Tecnologia")[index % 5],
     f"Dados de demonstração para os relatórios, filtros e testes do projeto {index:02d}.",
     ("ativo", "ativo", "em_andamento", "concluido", "inativo")[index % 5])
    for index in range(5, 16)
]

async def initialize_database(engine) -> None:
    # Importações registram todos os modelos no metadata antes da criação.
    _ = (ActivityLog, File, FileShare, FilePermission, ProjectMember, Project, User, Perfil, Module, Permission, ProfileModule, ProfilePermission, ProjectStatusCatalog, ProjectType, ReportType, SystemSetting, MenuItem)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        await connection.run_sync(_create_compatibility_tables)

    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import async_sessionmaker

    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        existing = {row.email for row in (await session.scalars(select(User))).all()}
        now = datetime.now(UTC)
        existing_perfis = {row.id for row in (await session.scalars(select(Perfil))).all()}
        for perfil_id, nome, descricao in SEED_PERFIS:
            if perfil_id not in existing_perfis:
                session.add(Perfil(id=perfil_id, nome=nome, descricao=descricao, criado_em=now))
        await session.flush()
        perfil_ids = {row.nome: row.id for row in (await session.scalars(select(Perfil))).all()}
        for item in SEED_MODULES:
            if not await session.get(Module, item[0]):
                session.add(Module(id=item[0], nome=item[1], rota=item[2], icone=item[3], ordem=item[4], ativo=True))
        await session.flush()
        for permission_id, module_id, name in SEED_PERMISSIONS:
            if not await session.get(Permission, permission_id):
                session.add(Permission(id=permission_id, modulo_id=module_id, nome=name, descricao=name, ativo=True))
        for status_id, code, name, color, order, editable in SEED_STATUS:
            if not await session.get(ProjectStatusCatalog, status_id):
                session.add(ProjectStatusCatalog(id=status_id, codigo=code, nome=name, cor=color, ordem=order, ativo=True, permite_edicao=editable))
        for type_id, code, name, description in SEED_TYPES:
            if not await session.get(ProjectType, type_id):
                session.add(ProjectType(id=type_id, codigo=code, nome=name, descricao=description, ativo=True))
        for report_id, code, name, formats in SEED_REPORTS:
            if not await session.get(ReportType, report_id):
                session.add(ReportType(id=report_id, codigo=code, nome=name, descricao=name, formatos=formats, ativo=True))
        for key, value, kind, description, group in SEED_SETTINGS:
            if not await session.get(SystemSetting, key):
                session.add(SystemSetting(chave=key, valor=value, tipo=kind, descricao=description, grupo=group, ativo=True))
        for menu_id, module_id, name, route, icon, order in SEED_MENUS:
            if not await session.get(MenuItem, menu_id):
                session.add(MenuItem(id=menu_id, modulo_id=module_id, nome=name, rota=route, icone=icon, ordem=order, ativo=True))
        await session.flush()
        for profile_id in perfil_ids.values():
            for permission_id, _, _ in SEED_PERMISSIONS:
                if not await session.get(ProfilePermission, {"perfil_id": profile_id, "permissao_id": permission_id}):
                    session.add(ProfilePermission(perfil_id=profile_id, permissao_id=permission_id, permitido=(profile_id == "ADM" or permission_id.endswith(".visualizar"))) )
        users = []
        seed_users = SEED_USERS + SEED_DEMO_USERS
        for name, email, role in seed_users:
            if email not in existing:
                users.append(User(id=str(uuid4()), name=name, email=email, role=role, perfil_id=perfil_ids.get(role, "PAR"), created_at=now))
        session.add_all(users)
        await session.flush()

        all_users = {row.email: row for row in (await session.scalars(select(User))).all()}
        admin = all_users[SEED_USERS[0][1]]
        manager = all_users[SEED_USERS[1][1]]
        auditor = all_users[SEED_USERS[2][1]]
        sponsor = all_users[SEED_USERS[3][1]]

        existing_codes = {row.code for row in (await session.scalars(select(Project))).all()}
        projects = []
        seed_projects = SEED_PROJECTS + SEED_DEMO_PROJECTS
        demo_users = list(all_users.values())
        for index, (name, code, area, description, status) in enumerate(seed_projects, start=1):
            project_users = demo_users[index % len(demo_users):] + demo_users[:index % len(demo_users)]
            participant_ids = [person.id for person in project_users[:min(7, len(project_users))]]
            manager_ids = [admin.id, manager.id] + [person.id for person in project_users[3:5]]
            if code not in existing_codes:
                project = Project(
                    id=f"demo-project-{index:02d}", name=name, code=code,
                    responsible_area=area, managers_ids=manager_ids,
                    write_group="SIGAC-Escrita", read_group="SIGAC-Leitura",
                    write_identity_role="administrador", read_identity_role="consultor",
                    snow_task_number=f"TASK{1000 + index}", parent_folder=f"/Demo/{code}",
                    description=description, status=status,
                    participants_ids=participant_ids,
                    created_at=now, updated_at=now,
                )
                projects.append(project)
        session.add_all(projects)
        await session.flush()

        all_projects = {row.code: row for row in (await session.scalars(select(Project))).all()}
        for project_index, project in enumerate(all_projects.values(), start=1):
            members_for_project = demo_users[project_index % len(demo_users):] + demo_users[:project_index % len(demo_users)]
            selected_members = [admin, manager, auditor] + members_for_project[:5]
            seen_member_ids = set()
            for member, papel in ((member, "gestor" if member.id != admin.id else "administrador") for member in selected_members):
                if member.id in seen_member_ids:
                    continue
                seen_member_ids.add(member.id)
                if not await session.get(ProjectMember, {"project_id": project.id, "user_id": member.id}):
                    session.add(ProjectMember(project_id=project.id, user_id=member.id, role=papel, created_at=now))

        demo_files = [
            ("arquivo", "Manual de Governança.pdf", 245760, "application/pdf"),
            ("pasta", "Relatórios", 0, "inode/directory"),
            ("arquivo", "Indicadores de Projetos.xlsx", 98304, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        ]
        for project in list(all_projects.values())[:3]:
            for file_index, (kind, name, size, mime) in enumerate(demo_files, start=1):
                file_id = f"demo-file-{project.code.lower().replace('-', '')}-{file_index}"
                exists = await session.scalar(select(File).where(File.id == file_id))
                if not exists:
                    session.add(File(id=file_id, project_id=project.id, parent_id=None, kind=kind, name=name, size_bytes=size, mime_type=mime, created_by=admin.id, created_at=now, updated_at=now))
        await session.flush()

        await session.execute(text("INSERT INTO permission_matrix(id, matrix) VALUES (1, :matrix) ON CONFLICT(id) DO NOTHING"), {"matrix": '{"admin":["*"],"auditor":["read"],"gerente":["read","write"]}'})
        await session.execute(text("INSERT INTO settings(key, value) VALUES (:key, :value) ON CONFLICT(key) DO NOTHING"), {"key": "seed_demo", "value": 'true'})
        for action, entity, entity_id, details in (("login", "sessao", None, "Login inicial"), ("create", "projeto", "demo-project-01", "Projeto criado pelo seed"), ("update", "projeto", "demo-project-02", "Status atualizado para teste")):
            session.add(ActivityLog(id=str(uuid4()), user_id=admin.id, action=action, entity=entity, entity_id=entity_id, details=details, created_at=now))

        await session.commit()


def _create_compatibility_tables(connection) -> None:
    # Sessões e membros ainda consumidos pelos endpoints legados.
    connection.execute(text("""
        CREATE TABLE IF NOT EXISTS sessions (
            id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36) NOT NULL,
            expires_at TIMESTAMP NOT NULL
        )
    """))
    connection.execute(text("""
        CREATE TABLE IF NOT EXISTS project_members (
            project_id VARCHAR(36) NOT NULL, user_id VARCHAR(36) NOT NULL,
            papel VARCHAR(40) NOT NULL, created_at TIMESTAMP NOT NULL,
            PRIMARY KEY (project_id, user_id)
        )
    """))
    connection.execute(text("""
        CREATE TABLE IF NOT EXISTS access_requests (
            id VARCHAR(36) PRIMARY KEY, project_id VARCHAR(36), requester_id VARCHAR(36),
            status VARCHAR(30), created_at TIMESTAMP NOT NULL
        )
    """))
    connection.execute(text("""
        CREATE TABLE IF NOT EXISTS permission_matrix (
            id INTEGER PRIMARY KEY, matrix TEXT NOT NULL
        )
    """))
    connection.execute(text("""
        CREATE TABLE IF NOT EXISTS settings (
            key VARCHAR(100) PRIMARY KEY, value TEXT NOT NULL
        )
    """))
    connection.execute(text("""
        CREATE TABLE IF NOT EXISTS activity_logs (
            id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36), action VARCHAR(100) NOT NULL,
            entity VARCHAR(100) NOT NULL, entity_id VARCHAR(36), details TEXT, created_at TIMESTAMP NOT NULL
        )
    """))
    connection.execute(text("CREATE INDEX IF NOT EXISTS ix_sessions_user_id ON sessions(user_id)"))
    connection.execute(text("CREATE INDEX IF NOT EXISTS ix_activity_logs_created_at ON activity_logs(created_at)"))

__all__ = ["initialize_database"]
