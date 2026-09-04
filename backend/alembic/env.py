from logging.config import fileConfig
from pathlib import Path
from urllib.parse import unquote, urlsplit, urlunsplit

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context
from app.core.config import settings
from app.db.base import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


def migration_database_url() -> str:
    """Resolve SQLite relativo ao backend e cria a pasta do arquivo."""
    url = settings.database_url
    if not url.startswith(("sqlite:///", "sqlite+aiosqlite:///")):
        return url

    parts = urlsplit(url)
    scheme = "sqlite+aiosqlite" if parts.scheme == "sqlite" else parts.scheme
    database_path = unquote(parts.path)
    # URLs SQLite relativas podem chegar como /./data/... no Windows.
    database_path = database_path.removeprefix("/")
    if database_path not in ("", ":memory:"):
        absolute_path = (Path(__file__).resolve().parents[1] / database_path).resolve()
        absolute_path.parent.mkdir(parents=True, exist_ok=True)
        # as_posix() gera C:/... no Windows, formato aceito pelo SQLAlchemy.
        return f"{scheme}:///{absolute_path.as_posix()}"

    return urlunsplit((scheme, parts.netloc, database_path, parts.query, parts.fragment))


DATABASE_URL = migration_database_url()
config.set_main_option("sqlalchemy.url", DATABASE_URL.replace("%", "%%"))
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = DATABASE_URL
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    import asyncio

    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
