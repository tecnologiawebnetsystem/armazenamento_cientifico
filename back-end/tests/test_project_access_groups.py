import os
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from uuid import uuid4

import httpx
import pytest
import pytest_asyncio
from dotenv import dotenv_values
from sqlalchemy import delete
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.db.models
from app.api.dependencies import get_current_user
from app.core.config import PROJECT_ROOT
from app.db.base import Base
from app.main import app
from app.modules.projects.controller import get_service
from app.modules.projects.models import Project, ProjectAccessGroup
from app.modules.projects.repository import ProjectRepository
from app.modules.projects.service import ProjectService


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
        "permissions": ["pesquisa.visualizar"],
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
            await session.execute(delete(Project).where(Project.id.in_(project_ids.values())))
            await session.commit()
        await engine.dispose()


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
        json={"accessLevel": "administrador"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["accessLevel"] == "administrador"

    delete_response = await http.delete(f"/api/projects/{project_a}/access-groups/{read_group_id}")
    assert delete_response.status_code == 204


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
