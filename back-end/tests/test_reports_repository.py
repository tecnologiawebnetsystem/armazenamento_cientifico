from datetime import UTC, datetime

import pytest_asyncio
from sqlalchemy import event
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.db.models  # noqa: F401
from app.db.base import Base
from app.modules.catalogs.models import ReportField, ReportType
from app.modules.projects.models import Project
from app.modules.reports.repository import ReportRepository
from app.modules.reports.service import ReportService

NOW = datetime.now(UTC)


def project(code: str, name: str, status: str, area: str) -> Project:
    return Project(
        id=f"id-{code}", name=name, code=code, responsible_area=area, status=status,
        description=f"desc {code}", created_at=NOW, updated_at=NOW,
    )


@pytest_asyncio.fixture
async def db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    @event.listens_for(engine.sync_engine, "connect")
    def enable_foreign_keys(dbapi_connection, _record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as session:
        session.add_all([
            ReportType(id="projetos", code="projetos", name="Projetos", description="", formats="csv", active=True),
            ReportType(id="acessos", code="acessos", name="Acessos", description="", formats="csv", active=True),
        ])
        await session.flush()
        session.add_all([
            ReportField(id="p-b", report_code="projetos", field_key="b", label="B", source_key="b", display_order=20, active=True),
            ReportField(id="p-a", report_code="projetos", field_key="a", label="A", source_key="a", display_order=10, active=True),
            ReportField(id="p-off", report_code="projetos", field_key="x", label="X", source_key="x", display_order=5, active=False),
            ReportField(id="a-2", report_code="acessos", field_key="y", label="Y", source_key="y", display_order=100, active=True),
            ReportField(id="a-1", report_code="acessos", field_key="z", label="Z", source_key="z", display_order=100, active=True),
            project("P1", "Beta", "ativo", "Redes"),
            project("P2", "Alfa", "ativo", "TI"),
            project("P3", "Gama", "encerrado", "Redes"),
        ])
        await session.commit()
        yield session
    await engine.dispose()


async def test_fields_returns_only_active_ordered_with_stable_ties(db):
    repo = ReportRepository(db)

    assert [f["id"] for f in await repo.fields("projetos")] == ["p-a", "p-b"]
    assert [f["id"] for f in await repo.fields("acessos")] == ["a-1", "a-2"]
    assert await repo.fields("inexistente") == []
    assert set((await repo.fields("projetos"))[0]) == {"id", "report_code", "field_key", "label", "source_key", "display_order", "active"}


async def test_projects_without_scope_keep_the_frontend_contract_keys(db):
    rows = await ReportRepository(db).projects(None, None, None, user_id="x", all_projects=True)

    assert [r["nome"] for r in rows] == ["Alfa", "Beta", "Gama"]
    assert set(rows[0]) == {
        "id", "nome", "codigo", "areaResponsavel", "responsaveis", "pastaMae", "status", "descricao", "criadoEm", "atualizadoEm", "totalMapas", "totalMembros",
    }
    assert (rows[0]["totalMapas"], rows[0]["totalMembros"]) == (0, 0)


async def test_projects_filter_by_status_and_area(db):
    repo = ReportRepository(db)

    assert [r["codigo"] for r in await repo.projects("encerrado", None, None, "x", True)] == ["P3"]
    assert [r["codigo"] for r in await repo.projects(None, "Redes", None, "x", True)] == ["P1", "P3"]
    assert [r["codigo"] for r in await repo.projects("ativo", "Redes", None, "x", True)] == ["P1"]
    assert await repo.projects("pausado", None, None, "x", True) == []


async def test_by_status_counts_projects(db):
    rows = await ReportRepository(db).by_status()

    assert {r["status"]: r["total"] for r in rows} == {"ativo": 2, "encerrado": 1}


async def test_service_builds_the_report_with_indicators(db):
    user = {"id": "x", "capabilities": ["all_projects"]}

    report = await ReportService(ReportRepository(db)).projects(None, None, None, user)

    assert set(report) == {"filtros", "indicadores", "porArea", "porStatus", "projetos"}
    assert report["filtros"] == {"status": "todos", "area": None, "gestorId": None}
    assert report["indicadores"]["totalProjetos"] == 3
    assert report["indicadores"]["ativos"] == 2
    assert report["indicadores"]["concluidos"] == 0


class RecordingSession:
    """Captura o SELECT sem executá-lo: o operador @> de JSONB não existe no SQLite."""

    def __init__(self) -> None:
        self.statements: list = []

    async def execute(self, statement):
        self.statements.append(statement)

        class Empty:
            def mappings(self):
                return self

            def all(self):
                return []

        return Empty()


async def test_scoped_projects_query_limits_by_manager_participant_or_member():
    session = RecordingSession()

    await ReportRepository(session).projects(None, None, None, user_id="u-1", all_projects=False)

    sql = str(session.statements[0].compile(dialect=postgresql.dialect()))
    # Com JSON().with_variant(JSONB(), "postgresql"), o contains() pode gerar
    # @> (operador JSONB nativo) ou LIKE (fallback JSON); ambos são válidos.
    assert ("@>" in sql or "LIKE" in sql) and "managers_ids" in sql and "participants_ids" in sql
    assert "EXISTS" in sql and "project_members" in sql


async def test_unscoped_projects_query_has_no_membership_filter():
    session = RecordingSession()

    await ReportRepository(session).projects(None, None, None, user_id="u-1", all_projects=True)

    sql = str(session.statements[0].compile(dialect=postgresql.dialect()))
    # Com JSON().with_variant(JSONB(), "postgresql"), sem filtro de escopo
    # não deve ter contains nem join com project_members.
    assert "@>" not in sql and "project_members" not in sql
