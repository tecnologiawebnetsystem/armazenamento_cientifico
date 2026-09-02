from collections.abc import AsyncIterator
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

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
            # Caminhos relativos devem ser resolvidos a partir de `backend`,
            # independentemente do diretório usado para iniciar o Uvicorn.
            path = Path(database_path)
            if not path.is_absolute():
                path = Path(__file__).resolve().parents[2] / path
            path.parent.mkdir(parents=True, exist_ok=True)
            url = f"sqlite+aiosqlite:///{path.as_posix()}"
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
