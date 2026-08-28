from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import text

from app.db.base import Base
from app.modules.audit.models import ActivityLog
from app.modules.files.models import File, FileShare
from app.modules.projects.models import Project
from app.modules.users.models import User

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

async def initialize_database(engine) -> None:
    # Importações registram todos os modelos no metadata antes da criação.
    _ = (ActivityLog, File, FileShare, Project, User)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        await connection.run_sync(_create_compatibility_tables)

    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import async_sessionmaker

    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        existing = {row.email for row in (await session.scalars(select(User))).all()}
        now = datetime.now(UTC)
        users = []
        for name, email, role in SEED_USERS:
            if email not in existing:
                users.append(User(id=str(uuid4()), name=name, email=email, role=role, created_at=now))
        session.add_all(users)
        await session.flush()

        all_users = {row.email: row for row in (await session.scalars(select(User))).all()}
        admin = all_users[SEED_USERS[0][1]]
        manager = all_users[SEED_USERS[1][1]]
        auditor = all_users[SEED_USERS[2][1]]
        sponsor = all_users[SEED_USERS[3][1]]

        existing_codes = {row.code for row in (await session.scalars(select(Project))).all()}
        projects = []
        for index, (name, code, area, description, status) in enumerate(SEED_PROJECTS, start=1):
            if code not in existing_codes:
                project = Project(
                    id=f"demo-project-{index:02d}", name=name, code=code,
                    responsible_area=area, managers_ids=[admin.id, manager.id],
                    write_group="SIGAC-Escrita", read_group="SIGAC-Leitura",
                    write_identity_role="administrador", read_identity_role="consultor",
                    snow_task_number=f"TASK{1000 + index}", parent_folder=f"/Demo/{code}",
                    description=description, status=status,
                    participants_ids=[manager.id, auditor.id, sponsor.id],
                    created_at=now, updated_at=now,
                )
                projects.append(project)
        session.add_all(projects)
        await session.flush()

        all_projects = {row.code: row for row in (await session.scalars(select(Project))).all()}
        for project in all_projects.values():
            for member, papel in ((admin, "administrador"), (manager, "gestor"), (auditor, "leitura")):
                await session.execute(text("""
                    INSERT INTO project_members(project_id, user_id, papel, created_at)
                    VALUES (:project_id, :user_id, :papel, :created_at)
                    ON CONFLICT(project_id, user_id) DO NOTHING
                """), {"project_id": project.id, "user_id": member.id, "papel": papel, "created_at": now})

        demo_files = [
            ("documento", "Manual de Governança.pdf", 245760, "application/pdf"),
            ("pasta", "Relatórios", 0, "inode/directory"),
            ("planilha", "Indicadores de Projetos.xlsx", 98304, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
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
        for action, entity, entity_id, details in (("login", "sessao", None, "Login de demonstração"), ("create", "projeto", "demo-project-01", "Projeto criado pelo seed"), ("update", "projeto", "demo-project-02", "Status atualizado para teste"), ("share", "arquivo", None, "Arquivo compartilhado para teste")):
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
    connection.execute(text("CREATE INDEX IF NOT EXISTS ix_sessions_user_id ON sessions(user_id)"))

__all__ = ["initialize_database"]
