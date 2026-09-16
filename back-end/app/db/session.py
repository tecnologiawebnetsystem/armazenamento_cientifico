from collections.abc import AsyncIterator
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings


def _async_database_url() -> str:
    url = settings.database_url
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    parts = urlsplit(url)
    if parts.query:
        query = [(key, value) for key, value in parse_qsl(parts.query) if key not in {"channel_binding", "sslmode"}]
        url = urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))
    return url


engine: AsyncEngine | None = None
session_factory: async_sessionmaker[AsyncSession] | None = None


def configure_engine() -> None:
    global engine, session_factory
    if engine is not None or not settings.database_url:
        return
    engine_options = {
        "echo": False,
        "pool_pre_ping": True,
        "pool_size": settings.db_max_size,
        "max_overflow": 0,
        "pool_timeout": settings.db_command_timeout,
        "connect_args": {"ssl": True},
    }
    engine = create_async_engine(_async_database_url(), **engine_options)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)


async def dispose_engine() -> None:
    global engine, session_factory
    if engine is not None:
        await engine.dispose()
    engine = None
    session_factory = None


async def get_session() -> AsyncIterator[AsyncSession]:
    configure_engine()
    if session_factory is None:
        raise RuntimeError("DATABASE_URL não configurada ou banco indisponível")
    async with session_factory() as session:
        yield session


async def connect() -> None:
    configure_engine()
    if engine is None:
        raise RuntimeError("DATABASE_URL não configurada")
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))


async def disconnect() -> None:
    await dispose_engine()


__all__ = ["connect", "disconnect", "engine", "get_session"]
