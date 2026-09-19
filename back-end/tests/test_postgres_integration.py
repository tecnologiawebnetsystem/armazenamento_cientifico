import os

import pytest

pytestmark = pytest.mark.integration


@pytest.mark.asyncio
async def test_postgres_connection_and_schema():
    database_url = os.getenv("RDS_AURORA_POSTGRES_URL", "")
    if not database_url.startswith(("postgresql://", "postgres://")):
        pytest.skip("RDS_AURORA_POSTGRES_URL não configurada para teste de integração")
    asyncpg = pytest.importorskip("asyncpg")
    try:
        conn = await asyncpg.connect(database_url)
    except (OSError, asyncpg.PostgresError) as exc:
        pytest.skip(f"PostgreSQL não acessível: {exc}")
    try:
        result = await conn.fetchval("select to_regclass('public.projects')")
        assert result == "projects"
    finally:
        await conn.close()
