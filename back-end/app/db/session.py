import ssl
from collections.abc import AsyncIterator
from pathlib import Path
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
    ssl_context: ssl.SSLContext | bool
    if settings.db_ssl_verify:
        if settings.db_ssl_ca_file:
            if not Path(settings.db_ssl_ca_file).is_file():
                raise RuntimeError("DB_SSL_CA_FILE aponta para um arquivo inexistente")
            ssl_context = ssl.create_default_context(cafile=settings.db_ssl_ca_file)
        else:
            ssl_context = ssl.create_default_context()
    else:
        ssl_context = False

    engine_options = {
        "echo": False,
        "pool_pre_ping": True,
        "pool_size": settings.db_max_size,
        "max_overflow": 0,
        "pool_timeout": settings.db_command_timeout,
        "connect_args": {"ssl": ssl_context, "server_settings": {"search_path": settings.db_schema}},
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
    import logging

    logger = logging.getLogger(__name__)
    configure_engine()
    if engine is None:
        raise RuntimeError("DATABASE_URL não configurada")
    logger.info("database_connect_start engine=postgresql pool_max=%s", settings.db_max_size)
    async with engine.connect() as connection:
        result = await connection.execute(text("SELECT current_database(), current_user, current_schema()"))
        database_name, database_user, schema_name = result.one()
    logger.info(
        "database_connect_ok database=%s user=%s schema=%s ssl_verify=%s",
        database_name,
        database_user,
        schema_name,
        settings.db_ssl_verify,
    )


async def disconnect() -> None:
    import logging

    logger = logging.getLogger(__name__)
    await dispose_engine()
    logger.info("database_disconnect_ok")


__all__ = ["connect", "disconnect", "engine", "get_session"]
