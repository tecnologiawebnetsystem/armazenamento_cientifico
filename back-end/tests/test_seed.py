import pytest
import pytest_asyncio
from sqlalchemy import event, func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.db.models  # noqa: F401
from app.core.config import settings
from app.db import seed
from app.db.base import Base
from app.modules.catalogs.models import (
    DashboardCard,
    MenuItem,
    MenuPermission,
    Module,
    Permission,
    ProfileModule,
    ProfilePermission,
    ProjectStatus,
    ReportField,
    ReportType,
    ResponsibleArea,
)
from app.modules.projects.models import Project, ProjectMember
from app.modules.users.models import Profile, User

# Contagens medidas no banco de DSV (2026-10-09): o seed deve reproduzi-las.
EXPECTED_REFERENCE_COUNTS = {
    Profile: 6, Module: 6, Permission: 11, ProfileModule: 36, ProfilePermission: 66, MenuItem: 6,
    MenuPermission: 6, DashboardCard: 3, ProjectStatus: 4, ResponsibleArea: 6, ReportType: 3, ReportField: 38, User: 4,
}


@pytest_asyncio.fixture
async def engine():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    @event.listens_for(engine.sync_engine, "connect")
    def enable_foreign_keys(dbapi_connection, _record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


async def count(engine, model) -> int:
    async with async_sessionmaker(engine)() as session:
        return await session.scalar(select(func.count()).select_from(model))


async def test_seed_reproduces_reference_data_from_an_empty_database(engine):
    await seed.initialize_database(engine)
    for model, expected in EXPECTED_REFERENCE_COUNTS.items():
        assert await count(engine, model) == expected, model.__tablename__


async def test_seed_is_idempotent(engine):
    await seed.initialize_database(engine)
    added = await seed.initialize_database(engine)
    assert sum(added.values()) == 0, added


async def test_seed_never_overwrites_existing_rows(engine):
    await seed.initialize_database(engine)
    async with async_sessionmaker(engine)() as session:
        (await session.get(Permission, "projeto.criar")).name = "Nome alterado"
        (await session.get(ProfilePermission, {"profile_id": "SOL", "permission_id": "projeto.visualizar"})).allowed = True
        await session.commit()

    await seed.initialize_database(engine)

    async with async_sessionmaker(engine)() as session:
        assert (await session.get(Permission, "projeto.criar")).name == "Nome alterado"
        assert (await session.get(ProfilePermission, {"profile_id": "SOL", "permission_id": "projeto.visualizar"})).allowed is True


async def test_seed_matches_profile_rules_of_the_database(engine):
    await seed.initialize_database(engine)
    async with async_sessionmaker(engine)() as session:
        allowed = {
            profile: sorted((await session.scalars(select(ProfilePermission.permission_id).where(
                ProfilePermission.profile_id == profile, ProfilePermission.allowed.is_(True)))).all())
            for profile in ("ADM", "AUD", "GER", "OPR", "PAT", "SOL")
        }
    assert len(allowed["ADM"]) == 10 and "administracao.configurar" not in allowed["ADM"]
    assert allowed["AUD"] == ["auditoria.visualizar"]
    assert allowed["OPR"] == ["administracao.configurar"]
    assert len(allowed["GER"]) == 5 and len(allowed["PAT"]) == 4 and allowed["SOL"] == []


async def test_sample_projects_are_optional_and_not_duplicated(engine):
    await seed.initialize_database(engine)
    assert await count(engine, Project) == 0

    added = await seed.initialize_database(engine, sample_projects=True)
    assert added["projects"] == 4
    assert await count(engine, Project) == 4 and await count(engine, ProjectMember) == 4

    assert (await seed.initialize_database(engine, sample_projects=True))["projects"] == 0


@pytest.mark.parametrize("environment", ["staging", "production"])
async def test_staging_and_production_load_reference_data_only(engine, monkeypatch, environment):
    monkeypatch.setattr(settings, "environment", environment)

    added = await seed.initialize_database(engine)

    assert "users" not in added and "projects" not in added
    for model, expected in EXPECTED_REFERENCE_COUNTS.items():
        assert await count(engine, model) == (0 if model is User else expected), model.__tablename__
    assert await count(engine, Project) == 0


async def test_sample_projects_are_refused_in_production(engine, monkeypatch):
    monkeypatch.setattr(settings, "environment", "production")
    with pytest.raises(RuntimeError, match="development ou test"):
        await seed.initialize_database(engine, sample_projects=True)
    assert await count(engine, Profile) == 0


async def test_unknown_environment_is_refused(engine, monkeypatch):
    monkeypatch.setattr(settings, "environment", "prod-typo")
    with pytest.raises(RuntimeError, match="desconhecido"):
        await seed.initialize_database(engine)
    assert await count(engine, Profile) == 0


def test_command_requires_confirmation_outside_development_and_test(monkeypatch):
    monkeypatch.setattr(settings, "environment", "production")
    assert seed.main([]) == 2
    assert seed.main(["--sample-projects", "--confirm"]) == 2


def test_command_refuses_unknown_environment(monkeypatch):
    monkeypatch.setattr(settings, "environment", "prod-typo")
    assert seed.main(["--confirm"]) == 2
