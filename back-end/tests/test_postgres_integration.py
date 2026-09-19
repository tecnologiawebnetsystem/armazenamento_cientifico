import os
from urllib.parse import quote_plus

import pytest


def _rds_url() -> str:
    direct_url = os.getenv("RDS_AURORA_POSTGRES_URL", "").strip()
    if direct_url:
        return direct_url
    host = os.getenv("RDS_AURORA_POSTGRES_HOST", "").strip()
    username = os.getenv("RDS_AURORA_POSTGRES_USERNAME", "").strip()
    password = os.getenv("RDS_AURORA_POSTGRES_PASSWORD", "")
    database = os.getenv("RDS_AURORA_POSTGRES_DATABASE", "armazenamento_cientifico")
    port = os.getenv("RDS_AURORA_POSTGRES_PORT", "5432")
    if not all((host, username, password)):
        return ""
    return f"postgresql://{quote_plus(username)}:{quote_plus(password)}@{host}:{port}/{quote_plus(database)}?sslmode=require"

pytestmark = pytest.mark.integration


@pytest.mark.asyncio
async def test_postgres_connection_and_schema():
    database_url = _rds_url()
    if not database_url.startswith(("postgresql://", "postgres://")):
        pytest.skip("Aurora PostgreSQL não configurado para teste de integração")
    asyncpg = pytest.importorskip("asyncpg")
    try:
        conn = await asyncpg.connect(database_url, ssl="require")
    except (OSError, asyncpg.PostgresError) as exc:
        pytest.skip(f"PostgreSQL não acessível: {exc}")
    try:
        result = await conn.fetchval("select to_regclass('public.projects')")
        assert result == "projects"
    finally:
        await conn.close()
