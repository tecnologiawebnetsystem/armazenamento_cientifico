import os
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import httpx
import pytest
import pytest_asyncio
from dotenv import dotenv_values
from sqlalchemy import delete, select
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.db.models
from app.api.dependencies import get_current_user
from app.core.config import PROJECT_ROOT
from app.db.base import Base
from app.main import app
from app.modules.projects.controller import get_service
from app.modules.projects.models import (
    Project,
    ProjectAccessGroup,
    ProjectFolderAccessMember,
    ProjectMember,
)
from app.modules.projects.repository import ProjectRepository
from app.modules.projects.service import ProjectService
from app.modules.users.models import Profile, User


def _test_database_url() -> str:
    configured_url = os.getenv("SIGAC_TEST_DATABASE_URL") or dotenv_values(
        PROJECT_ROOT / ".env"
    ).get("SIGAC_TEST_DATABASE_URL")
    if not configured_url:
        return "sqlite+aiosqlite:///:memory:"

    url = make_url(configured_url)
    if url.drivername in {"sqlite", "sqlite+pysqlite"}:
        url = url.set(drivername="sqlite+aiosqlite")
    elif url.drivername in {
        "postgres",
        "postgresql",
        "postgresql+asyncpg",
        "postgresql+psycopg",
    }:
        if not url.database or not url.database.lower().endswith(("_test", "_tests")):
            raise ValueError(
                "SIGAC_TEST_DATABASE_URL deve apontar para um banco dedicado com sufixo _test"
            )
        url = url.set(drivername="postgresql+asyncpg")
    elif url.drivername != "sqlite+aiosqlite":
        raise ValueError("SIGAC_TEST_DATABASE_URL deve usar PostgreSQL ou SQLite")
    return url.render_as_string(hide_password=False)


def test_postgres_test_database_requires_test_suffix(monkeypatch):
    monkeypatch.setenv("SIGAC_TEST_DATABASE_URL", "postgresql://user:pass@localhost/sigac")

    with pytest.raises(ValueError, match="sufixo _test"):
        _test_database_url()


def test_postgres_test_database_uses_asyncpg_driver(monkeypatch):
    monkeypatch.setenv(
        "SIGAC_TEST_DATABASE_URL",
        "postgresql+asyncpg://user:pass@localhost/sigac_test",
    )

    assert make_url(_test_database_url()).drivername == "postgresql+asyncpg"


@pytest.mark.asyncio
async def test_project_delete_preserves_activity_logs():
    session = AsyncMock()
    repository = ProjectRepository(session)

    await repository.delete(SimpleNamespace(id="project-1"))

    deleted_table_names = [
        call.args[0].table.name for call in session.execute.await_args_list
    ]
    assert "activity_logs" not in deleted_table_names
    session.delete.assert_awaited_once()


@pytest.mark.asyncio
async def test_effective_member_counts_merges_sigac_and_acl_without_duplicates():
    session = AsyncMock()
    session.execute.side_effect = [
        [("project-1", "user-1", "Ana.Silva")],
        [("project-1", "ana.silva"), ("project-1", "Bruno"), ("project-1", "BRUNO")],
        [],
    ]
    repository = ProjectRepository(session)

    counts = await repository.effective_member_counts(["project-1"])

    assert counts == {"project-1": 2}
    assert session.execute.await_count == 3


@pytest_asyncio.fixture
async def client() -> AsyncIterator[tuple[httpx.AsyncClient, dict[str, object], dict[str, str]]]:
    database_url = _test_database_url()
    engine = create_async_engine(database_url)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    project_ids = {"a": str(uuid4()), "b": str(uuid4())}
    user: dict[str, object] = {
        "id": "admin-1",
        "user_id": "admin-1",
        "role": "admin",
        "permissions": ["pesquisa.visualizar", "projeto.editar", "projeto.excluir"],
    }

    async def provide_service():
        async with factory() as session:
            yield ProjectService(ProjectRepository(session))

    async def provide_user():
        return user

    app.dependency_overrides[get_service] = provide_service
    app.dependency_overrides[get_current_user] = provide_user
    try:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all, checkfirst=True)
        now = datetime.now(UTC)
        async with factory() as session:
            session.add_all(
                [
                    Project(
                        id=project_ids["a"],
                        name="Projeto A",
                        code=f"A-{project_ids['a'][:8]}",
                        responsible_area="TI",
                        created_at=now,
                        updated_at=now,
                    ),
                    Project(
                        id=project_ids["b"],
                        name="Projeto B",
                        code=f"B-{project_ids['b'][:8]}",
                        responsible_area="TI",
                        created_at=now,
                        updated_at=now,
                    ),
                    Profile(id="GER", name="Responsável", role="gerente", created_at=now),
                    User(
                        id="member-1",
                        user_id="ana.silva",
                        profile_id="GER",
                        created_at=now,
                    ),
                ]
            )
            await session.commit()
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as http:
            yield http, user, project_ids
    finally:
        app.dependency_overrides.pop(get_service, None)
        app.dependency_overrides.pop(get_current_user, None)
        async with factory() as session:
            await session.execute(
                delete(ProjectAccessGroup).where(
                    ProjectAccessGroup.project_id.in_(project_ids.values())
                )
            )
            await session.execute(
                delete(ProjectMember).where(ProjectMember.project_id.in_(project_ids.values()))
            )
            await session.execute(delete(Project).where(Project.id.in_(project_ids.values())))
            await session.execute(delete(User).where(User.id == "member-1"))
            await session.execute(delete(Profile).where(Profile.id == "GER"))
            await session.commit()
        await engine.dispose()


async def test_project_delete_removes_project_scoped_records_without_affecting_other_projects(client):
    http, _, project_ids = client
    project_a = project_ids["a"]
    project_b = project_ids["b"]

    member = await http.post(
        f"/api/projects/{project_a}/members",
        json={"userId": "member-1", "papel": "gerente"},
    )
    access_group = await http.post(
        f"/api/projects/{project_a}/access-groups",
        json={
            "groupName": "Grupo da área A",
            "groupId": "entra-area-a",
            "accessLevel": "leitura",
        },
    )
    other_group = await http.post(
        f"/api/projects/{project_b}/access-groups",
        json={
            "groupName": "Grupo da área B",
            "groupId": "entra-area-b",
            "accessLevel": "leitura",
        },
    )
    assert member.status_code == 201
    assert access_group.status_code == 201
    assert other_group.status_code == 201

    deleted = await http.delete(f"/api/projects/{project_a}")

    assert deleted.status_code == 204
    assert (await http.get(f"/api/projects/{project_a}")).status_code == 404
    assert (await http.get(f"/api/projects/{project_a}/members")).status_code == 404
    remaining_groups = await http.get(f"/api/projects/{project_b}/access-groups")
    assert remaining_groups.status_code == 200
    assert [group["groupName"] for group in remaining_groups.json()["groups"]] == [
        "Grupo da área B"
    ]


async def test_project_access_groups_crud_filter_and_project_isolation(client):
    http, _, project_ids = client
    project_a = project_ids["a"]
    project_b = project_ids["b"]
    read_response = await http.post(
        f"/api/projects/{project_a}/access-groups",
        json={"groupName": "Grupo leitura A", "groupId": "entra-read-a", "accessLevel": "leitura"},
    )
    write_response = await http.post(
        f"/api/projects/{project_a}/access-groups",
        json={"groupName": "Grupo escrita A", "groupId": "entra-write-a", "accessLevel": "escrita"},
    )
    other_response = await http.post(
        f"/api/projects/{project_b}/access-groups",
        json={
            "groupName": "Grupo admin B",
            "groupId": "entra-admin-b",
            "accessLevel": "administrador",
        },
    )
    assert read_response.status_code == 201
    assert write_response.status_code == 201
    assert other_response.status_code == 201

    filtered = await http.get(f"/api/projects/{project_a}/access-groups?nivel=leitura")
    assert filtered.status_code == 200
    assert filtered.json()["total"] == 1
    assert filtered.json()["groups"][0]["groupName"] == "Grupo leitura A"
    assert filtered.json()["groups"][0]["accessLevel"] == "leitura"

    project_groups = await http.get(f"/api/projects/{project_a}/access-groups")
    assert {group["groupId"] for group in project_groups.json()["groups"]} == {
        "entra-read-a",
        "entra-write-a",
    }

    other_group_id = other_response.json()["id"]
    cross_project_patch = await http.patch(
        f"/api/projects/{project_a}/access-groups/{other_group_id}",
        json={"accessLevel": "leitura"},
    )
    assert cross_project_patch.status_code == 404

    cross_project_delete = await http.delete(
        f"/api/projects/{project_a}/access-groups/{other_group_id}"
    )
    assert cross_project_delete.status_code == 404
    other_groups = await http.get(f"/api/projects/{project_b}/access-groups")
    assert other_groups.json()["groups"][0]["accessLevel"] == "administrador"

    read_group_id = read_response.json()["id"]
    update_response = await http.patch(
        f"/api/projects/{project_a}/access-groups/{read_group_id}",
        json={
            "groupName": "Role de leitura atualizado",
            "identifier": "role-read-updated",
            "principalType": "role",
            "accessLevel": "administrador",
        },
    )
    assert update_response.status_code == 200
    assert update_response.json()["groupName"] == "Role de leitura atualizado"
    assert update_response.json()["identifier"] == "role-read-updated"
    assert update_response.json()["principalType"] == "role"
    assert update_response.json()["accessLevel"] == "administrador"
    assert update_response.json()["createdAt"]
    assert update_response.json()["updatedAt"]

    delete_response = await http.delete(f"/api/projects/{project_a}/access-groups/{read_group_id}")
    assert delete_response.status_code == 204
    catalog_after_unlink = await http.get(
        "/api/projects/groups/catalog",
        params={"search": "entra-read-a", "principalType": "group"},
    )
    assert catalog_after_unlink.json() == []


async def test_access_map_reads_groups_from_project_access_groups(client):
    http, _user, project_ids = client
    project_id = project_ids["a"]
    response = await http.post(
        f"/api/projects/{project_id}/access-groups",
        json={
            "groupName": "Grupo leitura principal",
            "groupId": "entra-group-read",
            "accessLevel": "leitura",
        },
    )
    assert response.status_code == 201

    access_map = await http.get(f"/api/projects/{project_id}/access-map")
    assert access_map.status_code == 200
    assert any(
        group["nome"] == "Grupo leitura principal" and group["nivel"] == "leitura"
        for group in access_map.json()["groups"]
    )
    assert "grupo de leitura não configurado" not in access_map.json()["gaps"]


async def test_project_groups_are_scoped_to_each_project(client):
    http, _, project_ids = client
    role = {
        "groupName": "Curador de coleção",
        "identifier": "scientific-curator",
        "principalType": "role",
        "accessLevel": "leitura",
    }
    first = await http.post(f"/api/projects/{project_ids['a']}/access-groups", json=role)
    duplicate = await http.post(
        f"/api/projects/{project_ids['a']}/access-groups",
        json={**role, "accessLevel": "escrita"},
    )
    other_project = await http.post(f"/api/projects/{project_ids['b']}/access-groups", json=role)

    assert first.status_code == 201
    assert first.json()["principalType"] == "role"
    assert duplicate.status_code == 409
    assert other_project.status_code == 201
    assert first.json()["id"] != other_project.json()["id"]

    catalog = await http.get(
        "/api/projects/groups/catalog",
        params={"search": "scientific-curator", "principalType": "role"},
    )
    assert catalog.status_code == 200
    assert len(catalog.json()) == 2
    assert all(item["identifier"] == "scientific-curator" for item in catalog.json())


async def test_project_member_search_and_crud(client):
    http, _, project_ids = client
    project_id = project_ids["a"]

    candidates = await http.get(
        f"/api/projects/{project_id}/member-candidates", params={"search": "ana"}
    )
    assert candidates.status_code == 200
    assert candidates.json() == [
        {
            "id": "member-1",
            "userId": "ana.silva",
            "perfilId": "GER",
            "perfilNome": "Responsável",
            "perfilRole": "gerente",
        }
    ]

    created = await http.post(
        f"/api/projects/{project_id}/members",
        json={"userId": "member-1", "papel": "gerente"},
    )
    assert created.status_code == 201
    assert created.json()["user"]["userId"] == "ana.silva"
    assert created.json()["user"]["perfilRole"] == "gerente"
    assert created.json()["papel"] == "gerente"

    duplicate = await http.post(
        f"/api/projects/{project_id}/members",
        json={"userId": "member-1", "papel": "admin"},
    )
    assert duplicate.status_code == 409

    listed = await http.get(f"/api/projects/{project_id}/members")
    assert len(listed.json()) == 1

    updated = await http.patch(
        f"/api/projects/{project_id}/members/member-1", json={"papel": "admin"}
    )
    assert updated.status_code == 200
    assert updated.json()["papel"] == "admin"
    assert updated.json()["user"]["perfilRole"] == "gerente"

    removed = await http.delete(f"/api/projects/{project_id}/members/member-1")
    assert removed.status_code == 204
    assert (await http.get(f"/api/projects/{project_id}/members")).json() == []
    assert (
        len(
            (
                await http.get(
                    f"/api/projects/{project_id}/member-candidates", params={"search": "ana"}
                )
            ).json()
        )
        == 1
    )


async def test_project_access_group_creation_requires_project_scope(client):
    http, user, project_ids = client
    user.update({"role": "solicitante"})

    response = await http.post(
        f"/api/projects/{project_ids['a']}/access-groups",
        json={
            "groupName": "Grupo fora do escopo",
            "groupId": "entra-out-of-scope",
            "accessLevel": "leitura",
        },
    )

    assert response.status_code == 403


async def test_project_folder_access_lists_sigac_groups_for_allowed_profiles(client, monkeypatch):
    from app.infrastructure.directory import DirectoryResolver

    monkeypatch.setattr(
        DirectoryResolver,
        "from_settings",
        classmethod(lambda cls, _settings: pytest.fail("A leitura não deve consultar o LDAP")),
    )
    http, user, project_ids = client
    await http.post(
        f"/api/projects/{project_ids['a']}/access-groups",
        json={"groupName": "Grupo da pasta", "groupId": "entra-pasta", "accessLevel": "escrita"},
    )

    response = await http.get(f"/api/projects/{project_ids['a']}/folder-access")

    assert response.status_code == 200
    body = response.json()
    assert body["aclStatus"] == "sem_pasta"
    assert [(entry["grupo"], entry["nivelSigac"]) for entry in body["entries"]] == [
        ("Grupo da pasta", "escrita")
    ]

    user.update({"role": "solicitante", "permissions": []})
    denied = await http.get(f"/api/projects/{project_ids['a']}/folder-access")
    assert denied.status_code == 403


@pytest.mark.asyncio
async def test_folder_access_snapshot_persists_members_in_database():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    now = datetime.now(UTC)
    payload = {
        "projectId": "project-snapshot",
        "projectName": "Projeto snapshot",
        "pasta": "/rede/projeto",
        "aclStatus": "ok",
        "aclMensagem": None,
        "herancaBloqueada": False,
        "proprietario": "owner",
        "entries": [
            {
                "grupo": "Grupo científico",
                "identificador": "S-1-5-21-200",
                "sid": "S-1-5-21-200",
                "tipo": "group",
                "nivelSigac": "escrita",
                "nivelRede": "escrita",
                "direitosRede": "Modificar",
                "negado": False,
                "herdado": True,
                "situacao": "conforme",
                "acessoAmplo": False,
                "fonteDiretorio": "ldap",
                "membros": [
                    {"login": "ana.silva", "nome": "Ana Silva", "email": "ana@example.com"}
                ],
                "membrosFonte": "ldap",
                "membrosTruncados": False,
            }
        ],
        "alertas": [],
        "avisos": [],
        "consultadoEm": now.isoformat(),
    }

    try:
        async with factory() as session:
            session.add(
                Project(
                    id="project-snapshot",
                    name="Projeto snapshot",
                    code="SNAPSHOT-1",
                    responsible_area="TI",
                    created_at=now,
                    updated_at=now,
                )
            )
            await session.commit()
            repository = ProjectRepository(session)
            assert await repository.replace_folder_access_snapshot(
                "project-snapshot", payload
            ) == 1

            stored = await repository.get_folder_access_snapshot("project-snapshot")
            persisted_members = list(
                await session.scalars(
                    select(ProjectFolderAccessMember).where(
                        ProjectFolderAccessMember.project_id == "project-snapshot"
                    )
                )
            )

            assert stored["entries"][0]["membros"] == payload["entries"][0]["membros"]
            assert len(persisted_members) == 1
            assert persisted_members[0].login == "ana.silva"
    finally:
        await engine.dispose()
