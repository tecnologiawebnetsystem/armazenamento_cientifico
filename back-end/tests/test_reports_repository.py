from datetime import UTC, datetime

import pytest_asyncio
from sqlalchemy import event
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.db.models  # noqa: F401
from app.db.base import Base
from app.modules.catalogs.models import ReportField, ReportType
from app.modules.projects.models import (
    Project,
    ProjectAccessGroup,
    ProjectFolderAccessMember,
    ProjectFolderAccessSnapshot,
    ProjectGroup,
    ProjectMember,
)
from app.modules.projects.repository import ProjectRepository
from app.modules.reports.repository import ReportRepository
from app.modules.reports.service import ReportService
from app.modules.users.models import Profile, User

NOW = datetime.now(UTC)


def project(code: str, name: str, status: str, area: str) -> Project:
    return Project(
        id=f"id-{code}",
        name=name,
        code=code,
        responsible_area=area,
        status=status,
        description=f"desc {code}",
        created_at=NOW,
        updated_at=NOW,
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
        session.add_all(
            [
                ReportType(
                    id="projetos",
                    code="projetos",
                    name="Projetos",
                    description="",
                    formats="csv",
                    active=True,
                ),
                ReportType(
                    id="acessos",
                    code="acessos",
                    name="Acessos",
                    description="",
                    formats="csv",
                    active=True,
                ),
            ]
        )
        await session.flush()
        session.add_all(
            [
                ReportField(
                    id="p-b",
                    report_code="projetos",
                    field_key="b",
                    label="B",
                    source_key="b",
                    display_order=20,
                    active=True,
                ),
                ReportField(
                    id="p-a",
                    report_code="projetos",
                    field_key="a",
                    label="A",
                    source_key="a",
                    display_order=10,
                    active=True,
                ),
                ReportField(
                    id="p-off",
                    report_code="projetos",
                    field_key="x",
                    label="X",
                    source_key="x",
                    display_order=5,
                    active=False,
                ),
                ReportField(
                    id="a-2",
                    report_code="acessos",
                    field_key="y",
                    label="Y",
                    source_key="y",
                    display_order=100,
                    active=True,
                ),
                ReportField(
                    id="a-1",
                    report_code="acessos",
                    field_key="z",
                    label="Z",
                    source_key="z",
                    display_order=100,
                    active=True,
                ),
                project("P1", "Beta", "ativo", "Redes"),
                project("P2", "Alfa", "ativo", "TI"),
                project("P3", "Gama", "encerrado", "Redes"),
            ]
        )
        await session.commit()
        yield session
    await engine.dispose()


async def test_fields_returns_only_active_ordered_with_stable_ties(db):
    repo = ReportRepository(db)

    assert [f["id"] for f in await repo.fields("projetos")] == ["p-a", "p-b"]
    assert [f["id"] for f in await repo.fields("acessos")] == ["a-1", "a-2"]
    assert await repo.fields("inexistente") == []
    assert set((await repo.fields("projetos"))[0]) == {
        "id",
        "report_code",
        "field_key",
        "label",
        "source_key",
        "display_order",
        "active",
    }


async def test_projects_without_scope_keep_the_frontend_contract_keys(db):
    rows = await ReportRepository(db).projects(None, None, None, user_id="x", all_projects=True)

    assert [r["nome"] for r in rows] == ["Alfa", "Beta", "Gama"]
    assert set(rows[0]) == {
        "id",
        "nome",
        "codigo",
        "areaResponsavel",
        "responsaveis",
        "pastaMae",
        "status",
        "descricao",
        "criadoEm",
        "atualizadoEm",
        "totalMapas",
        "totalMembros",
    }
    assert (rows[0]["totalMapas"], rows[0]["totalMembros"]) == (0, 0)


async def test_projects_filter_by_status_and_area(db):
    repo = ReportRepository(db)

    assert [r["codigo"] for r in await repo.projects("encerrado", None, None, "x", True)] == ["P3"]
    assert [r["codigo"] for r in await repo.projects(None, "Redes", None, "x", True)] == [
        "P1",
        "P3",
    ]
    assert [r["codigo"] for r in await repo.projects("ativo", "Redes", None, "x", True)] == ["P1"]
    assert await repo.projects("pausado", None, None, "x", True) == []


async def _add_access_group(db, *, group_id: str, identifier: str, name: str, level: str):
    db.add(
        ProjectGroup(
            group_id=group_id,
            project_id="id-P1",
            identifier=identifier,
            group_name=name,
            principal_type="group",
            access_level=level,
            source="manual",
            created_at=NOW,
            updated_at=NOW,
        )
    )
    await db.flush()
    db.add(
        ProjectAccessGroup(
            project_id="id-P1",
            group_id=group_id,
        )
    )
    await db.commit()


async def test_group_assignments_return_only_linked_groups_and_apply_filters(db):
    await _add_access_group(
        db,
        group_id="group-read-p1",
        identifier="entra-network-read",
        name="Rede leitura",
        level="leitura",
    )
    db.add(
        ProjectGroup(
            group_id="role-write-p2",
            project_id="id-P2",
            identifier="role-network-admin",
            group_name="Administradores de rede",
            principal_type="role",
            access_level="escrita",
            source="manual",
            created_at=NOW,
            updated_at=NOW,
        )
    )
    await db.flush()
    db.add(ProjectAccessGroup(project_id="id-P2", group_id="role-write-p2"))
    db.add(
        ProjectGroup(
            group_id="group-read-p2",
            project_id="id-P2",
            identifier="entra-network-read",
            group_name="Rede leitura",
            principal_type="group",
            access_level="leitura",
            source="manual",
            created_at=NOW,
            updated_at=NOW,
        )
    )
    await db.flush()
    db.add(ProjectAccessGroup(project_id="id-P2", group_id="group-read-p2"))
    await db.commit()

    repo = ReportRepository(db)
    rows = await repo.group_assignments(None, None, None, None, "x", all_projects=True)
    assert [(row["grupo"], row["projeto"], row["area"]) for row in rows] == [
        ("Administradores de rede", "Alfa", "TI"),
        ("Rede leitura", "Alfa", "TI"),
        ("Rede leitura", "Beta", "Redes"),
    ]
    assert len(await repo.group_assignments("entra-network", None, None, None, "x", True)) == 2
    assert len(await repo.group_assignments(None, "TI", "role", "escrita", "x", True)) == 1
    assert await repo.group_assignments(None, None, "group", "escrita", "x", True) == []


async def test_inconsistencies_ignore_unlinked_project_group_rows(db):
    db.add(
        ProjectGroup(
            group_id="orphan-group-p1",
            project_id="id-P1",
            identifier="orphan-identifier",
            group_name="Grupo sem vínculo",
            principal_type="group",
            access_level="leitura",
            source="manual",
            created_at=NOW,
            updated_at=NOW,
        )
    )
    await db.commit()

    rows = await ReportRepository(db).inconsistencies(
        None, None, None, "x", all_projects=True
    )
    p1 = next(row for row in rows if row["projetoId"] == "id-P1")
    assert p1["grupo"] is None
    assert p1["tipo"] == "projeto-sem-grupo"
    assert await ProjectRepository(db).search_catalog_groups("group", "orphan") == []


async def test_inconsistencies_use_project_access_groups_for_level_coverage(db):
    await _add_access_group(
        db,
        group_id="group-read-p1",
        identifier="entra-read-p1",
        name="Grupo de leitura",
        level="leitura",
    )

    repo = ReportRepository(db)
    incomplete = await repo.inconsistencies(None, None, None, "x", all_projects=True)
    p1 = next(row for row in incomplete if row["projetoId"] == "id-P1")
    assert p1["tipo"] == "grupo-incompleto"
    assert p1["grupo"] == "Grupo de leitura"

    await _add_access_group(
        db,
        group_id="group-write-p1",
        identifier="entra-write-p1",
        name="Grupo de escrita",
        level="escrita",
    )
    complete = await repo.inconsistencies(None, None, None, "x", all_projects=True)
    assert all(row["projetoId"] != "id-P1" for row in complete)


async def test_members_report_lists_explicit_project_members_and_filters(db):
    db.add(Profile(id="profile-1", name="Pesquisador", role="solicitante", description="", created_at=NOW))
    db.add(User(id="user-1", user_id="ana.silva", profile_id="profile-1", created_at=NOW))
    db.add(User(id="user-2", user_id="bruno.souza", profile_id=None, created_at=NOW))
    await db.flush()
    db.add_all(
        [
            ProjectMember(project_id="id-P1", user_id="user-1", role="gerente", created_at=NOW),
            ProjectMember(project_id="id-P2", user_id="user-2", role="auditor", created_at=NOW),
        ]
    )
    await db.commit()

    repo = ReportRepository(db)
    rows = await repo.members(None, None, "unrelated", all_projects=True)

    assert [(row["usuario"], row["projeto"], row["area"]) for row in rows] == [
        ("ana.silva", "Beta", "Redes"),
        ("bruno.souza", "Alfa", "TI"),
    ]
    assert rows[0]["perfil"] == "Pesquisador"
    assert rows[0]["papel"] == "gerente"
    assert [row["usuario"] for row in await repo.members("bruno", None, "unrelated", True)] == [
        "bruno.souza"
    ]
    assert [row["usuario"] for row in await repo.members(None, "Redes", "unrelated", True)] == [
        "ana.silva"
    ]
    assert await repo.members("sem correspondência", None, "unrelated", True) == []


async def test_members_report_lists_directory_members_once_with_all_area_links(db):
    from app.modules.projects.folder_access import folder_access_entry_key

    group_entry = {
        "grupo": "Grupo de Pesquisa",
        "identificador": "grupo-pesquisa",
        "sid": "S-1-5-21-1",
        "tipo": "group",
        "nivelSigac": "escrita",
    }
    second_group = {
        "grupo": "Grupo de Dados",
        "identificador": "grupo-dados",
        "sid": "S-1-5-21-2",
        "tipo": "group",
        "nivelSigac": "leitura",
    }
    db.add_all([
        ProjectFolderAccessSnapshot(
            project_id="id-P1",
            payload={"entries": [group_entry]},
            synced_at=NOW,
        ),
        ProjectFolderAccessSnapshot(
            project_id="id-P3",
            payload={"entries": [second_group]},
            synced_at=NOW,
        ),
    ])
    await db.flush()
    db.add_all([
        ProjectFolderAccessMember(
            project_id="id-P1",
            entry_key=folder_access_entry_key(group_entry),
            login="alberto.funada",
            name="Alberto Seiti Funada",
            email="alberto@example.com",
        ),
        ProjectFolderAccessMember(
            project_id="id-P3",
            entry_key=folder_access_entry_key(second_group),
            login="alberto.funada",
            name="Alberto Seiti Funada",
            email="alberto@example.com",
        ),
    ])
    await db.commit()

    report = await ReportService(ReportRepository(db)).members(
        "Alberto", None, {"id": "unrelated", "role": "gerente"}
    )

    assert report["total"] == 1
    assert report["membros"][0]["usuario"] == "alberto.funada"
    assert report["membros"][0]["nome"] == "Alberto Seiti Funada"
    assert report["membros"][0]["email"] == "alberto@example.com"
    assert [(link["area"], link["grupo"], link["nivel"]) for link in report["membros"][0]["vinculos"]] == [
        ("Redes", "Grupo de Dados", "leitura"),
        ("Redes", "Grupo de Pesquisa", "escrita"),
    ]

    key_report = await ReportService(ReportRepository(db)).members(
        "alberto.funada", None, {"id": "unrelated", "role": "gerente"}
    )
    assert key_report["total"] == 1
    assert key_report["membros"][0]["usuario"] == "alberto.funada"


async def test_members_report_scopes_rows_to_authorized_projects(db):
    db.add_all(
        [
            User(id="user-1", user_id="ana.silva", profile_id=None, created_at=NOW),
            User(id="user-2", user_id="bruno.souza", profile_id=None, created_at=NOW),
        ]
    )
    await db.flush()
    db.add_all(
        [
            ProjectMember(project_id="id-P1", user_id="user-1", role="gerente", created_at=NOW),
            ProjectMember(project_id="id-P2", user_id="user-2", role="auditor", created_at=NOW),
        ]
    )
    await db.commit()

    rows = await ReportRepository(db).members(None, None, "user-1", all_projects=False)

    assert [row["usuario"] for row in rows] == ["ana.silva"]


async def test_by_status_counts_projects(db):
    rows = await ReportRepository(db).by_status()

    assert {r["status"]: r["total"] for r in rows} == {"ativo": 2, "encerrado": 1}


async def test_service_builds_the_report_with_indicators(db):
    # has_capability() verifica permissions (formato DB) ou role capabilities.
    # Para que all_projects seja True, o usuário precisa ter 'projeto.visualizar'
    # em permissions (via CAPABILITY_PERMISSION_MAP) OU role com all_projects.
    user = {"id": "x", "user_id": "x", "role": "admin", "permissions": ["projeto.visualizar"]}

    report = await ReportService(ReportRepository(db)).projects(None, None, None, user)

    assert set(report) == {"filtros", "indicadores", "porArea", "porStatus", "projetos"}
    assert report["filtros"] == {"status": "todos", "area": None, "gestorId": None}
    assert report["indicadores"]["totalProjetos"] == 3


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
    # O subquery de totalMembros pode consultar project_members; a consulta
    # principal não deve incluir o filtro de escopo por EXISTS/LIKE.
    assert "@>" not in sql and "EXISTS" not in sql and " LIKE " not in sql
