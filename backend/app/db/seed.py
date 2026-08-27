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

async def initialize_database(engine) -> None:
    # Importações registram todos os modelos no metadata antes da criação.
    _ = (ActivityLog, File, FileShare, Project, User)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        await connection.run_sync(_create_compatibility_tables)

    from sqlalchemy.ext.asyncio import async_sessionmaker
    from sqlalchemy import select

    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        existing = {row.email for row in (await session.scalars(select(User))).all()}
        now = datetime.now(UTC)
        users = []
        for name, email, role in SEED_USERS:
            if email not in existing:
                users.append(User(id=str(uuid4()), name=name, email=email, role=role, created_at=now))
        session.add_all(users)
        await session.commit()


def _create_compatibility_tables(connection) -> None:
    # Sessões e membros ainda consumidos pelos endpoints legados.
    connection.execute(text("""
        CREATE TABLE IF NOT EXISTS app_sessions (
            id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36) NOT NULL,
            expires_at TIMESTAMP NOT NULL
        )
    """))
    connection.execute(text("""
        CREATE TABLE IF NOT EXISTS app_project_members (
            project_id VARCHAR(36) NOT NULL, user_id VARCHAR(36) NOT NULL,
            papel VARCHAR(40) NOT NULL, created_at TIMESTAMP NOT NULL,
            PRIMARY KEY (project_id, user_id)
        )
    """))
    connection.execute(text("""
        CREATE TABLE IF NOT EXISTS app_access_requests (
            id VARCHAR(36) PRIMARY KEY, project_id VARCHAR(36), requester_id VARCHAR(36),
            status VARCHAR(30), created_at TIMESTAMP NOT NULL
        )
    """))
    connection.execute(text("""
        CREATE TABLE IF NOT EXISTS app_permission_matrix (
            id INTEGER PRIMARY KEY, matrix TEXT NOT NULL
        )
    """))
    connection.execute(text("""
        CREATE TABLE IF NOT EXISTS app_settings (
            key VARCHAR(100) PRIMARY KEY, value TEXT NOT NULL
        )
    """))
    connection.execute(text("CREATE INDEX IF NOT EXISTS ix_app_sessions_user_id ON app_sessions(user_id)"))

__all__ = ["initialize_database"]
