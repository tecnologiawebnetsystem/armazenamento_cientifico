from collections.abc import AsyncIterator
from pathlib import Path

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings


def _async_database_url() -> str:
    url = settings.database_url
    if settings.database_engine == "sqlite" and url.startswith("sqlite://"):
        url = url.replace("sqlite://", "sqlite+aiosqlite://", 1)
    if settings.database_engine == "sqlite" and url.startswith("sqlite+aiosqlite:///"):
        database_path = url.removeprefix("sqlite+aiosqlite:///")
        if database_path not in (":memory:", ""):
            Path(database_path).parent.mkdir(parents=True, exist_ok=True)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


engine: AsyncEngine | None = None
session_factory: async_sessionmaker[AsyncSession] | None = None


def configure_engine() -> None:
    global engine, session_factory
    if engine is not None or not settings.database_url:
        return
    engine_options = {"echo": False}
    if settings.database_engine != "sqlite":
        engine_options.update(
            pool_pre_ping=True,
            pool_size=settings.db_max_size,
            max_overflow=0,
            pool_timeout=settings.db_command_timeout,
        )
    engine = create_async_engine(_async_database_url(), **engine_options)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)


async def dispose_engine() -> None:
    global engine, session_factory
    if engine is not None:
        await engine.dispose()
    engine = None
    session_factory = None


async def get_pool():
    """Compatibilidade para módulos legados que usam asyncpg.

    O pool continua sendo gerenciado pelo legacy_api durante a migração;
    esta função evita imports quebrados sem alterar contratos HTTP.
    """
    from app.legacy_api import db

    return await db()


async def get_session() -> AsyncIterator[AsyncSession]:
    configure_engine()
    if session_factory is None:
        raise RuntimeError("DATABASE_URL não configurada ou banco indisponível")
    async with session_factory() as session:
        yield session


async def connect() -> None:
    configure_engine()
    if engine is not None and settings.seed_database:
        from app.db.seed import initialize_database
        await initialize_database(engine)


async def disconnect() -> None:
    await dispose_engine()


__all__ = ["connect", "disconnect", "engine", "get_pool", "get_session"]
