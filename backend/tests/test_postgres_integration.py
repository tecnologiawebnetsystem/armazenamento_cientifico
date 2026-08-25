import os

import pytest

pytestmark = pytest.mark.integration


@pytest.mark.asyncio
async def test_postgres_connection_and_schema():
    if not os.getenv('DATABASE_URL'):
        pytest.skip('DATABASE_URL não configurada para teste de integração')
    asyncpg = pytest.importorskip('asyncpg')
    conn = await asyncpg.connect(os.environ['DATABASE_URL'])
    try:
        result = await conn.fetchval("select to_regclass('public.app_projects')")
        assert result == 'app_projects'
    finally:
        await conn.close()
