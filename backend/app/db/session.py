from collections.abc import AsyncIterator

import asyncpg

from app.core.config import settings

_pool: asyncpg.Pool | None = None

async def connect() -> None:
    global _pool
    if settings.database_url and _pool is None:
        try:
            _pool = await asyncpg.create_pool(
                settings.database_url,
                min_size=settings.db_min_size,
                max_size=settings.db_max_size,
                command_timeout=settings.db_command_timeout,
            )
        except (OSError, asyncpg.PostgresError):
            _pool = None

async def disconnect() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None

async def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError('DATABASE_URL não configurada ou banco indisponível')
    return _pool

async def connection() -> AsyncIterator[asyncpg.Connection]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        yield conn
