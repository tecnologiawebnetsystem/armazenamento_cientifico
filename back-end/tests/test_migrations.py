import os
import re
from collections import Counter
from pathlib import Path

import pytest
from alembic.config import Config
from alembic.script import ScriptDirectory

BACKEND_ROOT = Path(__file__).resolve().parents[1]
VERSIONS_DIR = BACKEND_ROOT / "alembic" / "versions"


@pytest.fixture(scope="module")
def script() -> ScriptDirectory:
    return ScriptDirectory.from_config(Config(str(BACKEND_ROOT / "alembic.ini")))


def test_there_is_a_single_head(script: ScriptDirectory):
    heads = script.get_heads()
    assert len(heads) == 1, f"Mais de um head do Alembic: {heads}. Use `alembic merge heads`."


def test_there_is_a_single_base(script: ScriptDirectory):
    assert len(script.get_bases()) == 1


def test_every_revision_file_belongs_to_the_chain(script: ScriptDirectory):
    # walk_revisions falha se algum down_revision apontar para uma revisão inexistente.
    revisions = list(script.walk_revisions())
    files = [path for path in VERSIONS_DIR.glob("*.py") if path.name != "__init__.py"]
    assert len(revisions) == len(files), "Há arquivo em alembic/versions fora da cadeia ou id repetido"


def test_chain_is_linear(script: ScriptDirectory):
    revisions = list(script.walk_revisions())
    for revision in revisions:
        assert not isinstance(revision.down_revision, tuple), f"{revision.revision} é um merge"
        assert not revision.branch_labels, f"{revision.revision} usa branch_labels"
    children = Counter(rev.down_revision for rev in revisions if rev.down_revision)
    branched = [parent for parent, total in children.items() if total > 1]
    assert not branched, f"Revisões com mais de um filho: {branched}"


def test_every_revision_defines_upgrade_and_downgrade(script: ScriptDirectory):
    for revision in script.walk_revisions():
        assert callable(getattr(revision.module, "upgrade", None)), revision.revision
        assert callable(getattr(revision.module, "downgrade", None)), revision.revision


@pytest.mark.integration
@pytest.mark.asyncio
async def test_database_revision_matches_head(script: ScriptDirectory):
    database_url = os.getenv("RDS_AURORA_POSTGRES_URL", "")
    if not database_url.startswith(("postgresql://", "postgres://")):
        pytest.skip("RDS_AURORA_POSTGRES_URL não configurada para teste de integração")
    schema = os.getenv("DB_SCHEMA", "public")
    assert re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", schema), "DB_SCHEMA inválido"
    asyncpg = pytest.importorskip("asyncpg")
    try:
        connection = await asyncpg.connect(database_url, timeout=10)
    except (OSError, TimeoutError, asyncpg.PostgresError) as exc:
        pytest.skip(f"PostgreSQL não acessível: {exc}")
    try:
        current = await connection.fetchval(f'select version_num from "{schema}".alembic_version')
    finally:
        await connection.close()
    assert current == script.get_current_head()
