from datetime import UTC, datetime

import pytest_asyncio
from sqlalchemy import event
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.db.models  # noqa: F401
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
from app.modules.platform.repository import PlatformRepository
from app.modules.projects.models import Project, ProjectMember
from app.modules.users.models import Profile, User

NOW = datetime.now(UTC)


def area(aid: str, name: str) -> ResponsibleArea:
    return ResponsibleArea(id=aid, name=name, prefix=name[:3].upper(), next_number=1, active=True, created_at=NOW, updated_at=NOW)


def profile(pid: str, name: str) -> Profile:
    return Profile(id=pid, name=name, description="", created_at=NOW)


def module(mid: str, name: str, route: str, icon: str, order: int, active: bool = True) -> Module:
    return Module(id=mid, name=name, route=route, icon=icon, display_order=order, active=active)


def menu(mid: str, module_id: str | None, name: str, route: str, icon: str, order: int, active: bool = True, parent_id: str | None = None) -> MenuItem:
    return MenuItem(id=mid, module_id=module_id, parent_id=parent_id, name=name, route=route, icon=icon, display_order=order, active=active)


def permission(pid: str, module_id: str, name: str, active: bool = True) -> Permission:
    return Permission(id=pid, module_id=module_id, name=name, description="", active=active)


def card(cid: str, key: str, title: str, profile_ids: str) -> DashboardCard:
    return DashboardCard(id=cid, key=key, title=title, description="", metric_key=key, route=f"/{key}", profile_ids=profile_ids, display_order=1, active=True)


def status(sid: str, code: str, name: str, allows_edit: bool = False) -> ProjectStatus:
    return ProjectStatus(id=sid, code=code, name=name, color="gray", display_order=1, active=True, allows_edit=allows_edit)


def report_type(rid: str, code: str) -> ReportType:
    return ReportType(id=rid, code=code, name=code, description="", formats="csv", active=True)


def report_field(fid: str, report_code: str, field_key: str) -> ReportField:
    return ReportField(id=fid, report_code=report_code, field_key=field_key, label=field_key, source_key=field_key, display_order=1, active=True)


@pytest_asyncio.fixture
async def session(monkeypatch):
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    @event.listens_for(engine.sync_engine, "connect")
    def enable_foreign_keys(dbapi_connection, _record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as db:
        # Seed de dados para os testes de platform
        db.add_all([
            profile("ADM", "administrador"), profile("GER", "gerente"),
            area("redes", "Redes"), area("ti", "TI"),
            module("projetos", "Projetos", "/projetos", "folder", 1),
            module("configuracoes", "Configurações", "/configuracoes", "settings", 10),
            module("dashboard", "Dashboard", "/dashboard", "layout-dashboard", 0),
        ])
        await db.flush()
        db.add_all([
            permission("projeto.visualizar", "projetos", "Ver"),
            permission("administracao.configurar", "configuracoes", "Configurar"),
            permission("dashboard.visualizar", "dashboard", "Dashboard"),
        ])
        await db.flush()
        db.add_all([
            ProfileModule(profile_id="ADM", module_id="projetos", can_view=True),
            ProfileModule(profile_id="ADM", module_id="configuracoes", can_view=True),
            ProfileModule(profile_id="GER", module_id="projetos", can_view=True),
            ProfilePermission(profile_id="ADM", permission_id="projeto.visualizar", allowed=True),
            ProfilePermission(profile_id="ADM", permission_id="administracao.configurar", allowed=False),
            ProfilePermission(profile_id="GER", permission_id="projeto.visualizar", allowed=True),
            ProfilePermission(profile_id="GER", permission_id="administracao.configurar", allowed=True),
        ])
        await db.flush()
        db.add_all([
            menu("m-projetos", "projetos", "Projetos", "/projetos", "folder", 1),
            menu("m-config", "configuracoes", "Configurações", "/configuracoes", "settings", 10),
            menu("m-sem-modulo", None, "Sem modulo", "/x", "circle", 20),
            MenuPermission(menu_id="m-projetos", permission_id="projeto.visualizar", allowed=True),
            MenuPermission(menu_id="m-config", permission_id="administracao.configurar", allowed=True),
            card("c1", "projetos", "Projetos", "ADM,GER"), card("c2", "admin", "Admin", "ADM"),
            card("c3", "inativo", "Inativo", "ADM,GER"),
            status("ativo", "ativo", "Ativo", True), status("encerrado", "encerrado", "Encerrado"),
            report_type("projetos", "projetos"), report_type("acessos", "acessos"),
        ])
        await db.flush()
        db.add_all([
            report_field("r1", "projetos", "nome"), report_field("r2", "projetos", "status"),
            report_field("r3", "acessos", "fonte"),
        ])
        await db.flush()
        await db.execute(
            DashboardCard.__table__.update().where(DashboardCard.id == "c3").values(active=False)
        )
        await db.commit()
        yield db
    await engine.dispose()


# ── context ────────────────────────────────────────────────────────


async def test_context_returns_user_and_permissions_for_active_profile(session):
    result = await PlatformRepository(session).context({"profile_id": "ADM", "id": "s1", "email": "a@x.com", "name": "Ana", "profile_name": "admin"})

    assert result["user"] == {"id": "s1", "email": "a@x.com", "nome": "Ana", "perfil_id": "ADM", "perfil_nome": "admin"}
    assert result["permissions"] == ["projeto.visualizar"]
    assert len(result["modules"]) == 2
    assert {m["id"] for m in result["modules"]} == {"projetos", "configuracoes"}
    assert {m["nome"] for m in result["modules"]} == {"Projetos", "Configurações"}
    assert len(result["dashboardCards"]) == 2  # c1 e c2; c3 inativa


async def test_context_excludes_menus_for_module_not_viewable_by_profile(session):
    result = await PlatformRepository(session).context({"profile_id": "GER"})
    assert any(m["id"] == "m-projetos" for m in result["menus"])
    assert not any(m["id"] == "m-config" for m in result["menus"])


async def test_context_returns_menu_without_module_when_public(session):
    result = await PlatformRepository(session).context({"profile_id": "GER"})
    assert any(m["id"] == "m-sem-modulo" for m in result["menus"])


async def test_context_returns_empty_lists_for_no_profile(session):
    result = await PlatformRepository(session).context({"profile_id": None})
    assert result["permissions"] == []
    assert result["modules"] == []
    assert result["menus"] == []
    assert result["dashboardCards"] == []


async def test_context_card_filter_matches_comma_separated_ids(session):
    result = await PlatformRepository(session).context({"profile_id": "GER"})
    assert {c["id"] for c in result["dashboardCards"]} == {"c1"}


# ── dashboard ───────────────────────────────────────────────────────


async def test_dashboard_returns_projects_with_storage_sum(session):
    session.add(Project(id="p1", name="Beta", code="B", responsible_area="Redes", status="ativo", description="", created_at=NOW, updated_at=NOW))
    await session.commit()

    result = await PlatformRepository(session).dashboard()

    assert set(result) == {"projects", "totalMembros", "totalMapas", "armazenamentoMb", "activity", "source", "consultedAt"}
    assert len(result["projects"]) == 1
    assert result["projects"][0]["nome"] == "Beta"
    assert result["projects"][0]["areaResponsavel"] == "Redes"
    assert "armazenamentoUsadoMb" in result["projects"][0]


# ── dashboard: sem chamador, não migrado ─────────────────────────────


__import__("pytest").mark.skip(reason="ORM")