from collections.abc import AsyncIterator

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
    engine = create_async_engine(
        _async_database_url(),
        pool_pre_ping=True,
        pool_size=settings.db_max_size,
        max_overflow=0,
        pool_timeout=settings.db_command_timeout,
    )
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


async def disconnect() -> None:
    await dispose_engine()


__all__ = ["connect", "disconnect", "engine", "get_session"]
