import base64
import json
from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta

import httpx
import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy import event, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.db.models
from app.api import dependencies
from app.api.routes import cav4_auth
from app.core.config import settings
from app.db.base import Base
from app.infrastructure.cav4.provider import CAV4Identity
from app.main import app
from app.modules.audit.models import ActivityLog
from app.modules.auth.models import UserSession
from app.modules.auth.repository import AuthRepository
from app.modules.auth.service import Cav4SessionService
from app.modules.catalogs.models import Module, Permission, ProfilePermission
from app.modules.users.models import Profile, User

NOW = datetime.now(UTC)


@pytest_asyncio.fixture
async def factory():
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
        # Sem relationship() o ORM não ordena as inserções por FK: um flush por nível.
        session.add_all([
            Module(id="projetos", name="Projetos", route="/projetos", icon="folder", display_order=1, active=True),
            Profile(id="ADM", name="administrador", description="", created_at=NOW),
        ])
        await session.flush()
        session.add_all([
            Permission(id="projeto.visualizar", module_id="projetos", name="Ver", description="", active=True),
            Permission(id="projeto.editar", module_id="projetos", name="Editar", description="", active=True),
            Permission(id="projeto.criar", module_id="projetos", name="Criar", description="", active=False),
            User(id="u1", user_id="GFZ3", profile_id="ADM", created_at=NOW),
            User(id="u2", user_id="ana@petrobras.com.br", profile_id="ADM", created_at=NOW),
            User(id="u3", user_id="SEMPERFIL", profile_id=None, created_at=NOW),
        ])
        await session.flush()
        session.add_all([
            ProfilePermission(profile_id="ADM", permission_id="projeto.visualizar", allowed=True),
            ProfilePermission(profile_id="ADM", permission_id="projeto.editar", allowed=False),
            ProfilePermission(profile_id="ADM", permission_id="projeto.criar", allowed=True),
        ])
        await session.commit()
    yield maker
    await engine.dispose()


def identity(**overrides) -> CAV4Identity:
    data = {
        "subject": "sub-1", "email": "ana@petrobras.com.br", "user_login": "GFZ3", "display_name": "Ana",
        "roles": ("ADM",), "raw_claims": {"cargo": " Analista ", "department": "TI"},
    }
    return CAV4Identity(**{**data, **overrides})


async def start(factory, ident: CAV4Identity) -> str:
    async with factory() as db:
        return await Cav4SessionService(AuthRepository(db)).start(ident)


async def rows(factory, model):
    async with factory() as db:
        return list((await db.scalars(select(model))).all())


async def test_start_creates_session_log_and_updates_last_login(factory):
    session_id = await start(factory, identity())

    (session,) = await rows(factory, UserSession)
    assert (session.id, session.user_id, session.profile_id) == (session_id, "GFZ3", "ADM")
    assert session.profile_data["display_name"] == "Ana"
    assert session.profile_data["job_title"] == "Analista"
    assert session.profile_data["area"] == "TI"
    assert session.created_at is not None
    assert session.expires_at.tzinfo is None
    assert session.expires_at > datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=settings.session_hours - 1)

    (log,) = await rows(factory, ActivityLog)
    assert (log.user_id, log.action, log.entity, log.entity_id, log.result) == ("GFZ3", "cav4_authorization", "session", session_id, "success")
    assert json.loads(log.details)["roles_received"] == ["ADM"]

    user = next(u for u in await rows(factory, User) if u.user_id == "GFZ3")
    assert user.last_login_at is not None


async def test_new_login_replaces_the_previous_session(factory):
    first = await start(factory, identity())
    second = await start(factory, identity())

    assert first != second
    assert [s.id for s in await rows(factory, UserSession)] == [second]


async def test_login_is_preferred_over_subject_and_email(factory):
    await start(factory, identity(user_login="GFZ3", subject="ana@petrobras.com.br"))
    (session,) = await rows(factory, UserSession)
    assert session.user_id == "GFZ3"


async def test_falls_back_to_email_when_login_is_unknown(factory):
    await start(factory, identity(user_login="DESCONHECIDO", subject="sub-x"))
    (session,) = await rows(factory, UserSession)
    assert session.user_id == "ana@petrobras.com.br"


@pytest.mark.parametrize(
    ("ident", "status", "message"),
    [
        (identity(email=""), 401, "E-mail ausente"),
        (identity(user_login="NAOEXISTE", subject="x", email="x@y.com", roles=("DESCONHECIDO",)), 403, "sem perfil configurado"),
        (identity(user_login="SEMPERFIL", subject="x", email="x@y.com", roles=("DESCONHECIDO",)), 403, "sem perfil"),
    ],
)
async def test_start_rejects_invalid_identities(factory, ident, status, message):
    with pytest.raises(HTTPException) as error:
        await start(factory, ident)
    assert error.value.status_code == status
    assert message in error.value.detail
    # Usuários que não existem são agora criados automaticamente (com profile_id=None,
    # pois as roles enviadas não batem com nenhum perfil na tabela profiles),
    # portanto a sessão e o log de auditoria NÃO são criados, mas o usuário é.
    if ident.user_login == "NAOEXISTE":
        users = await rows(factory, User)
        assert any(u.user_id == "NAOEXISTE" for u in users)
        assert all(u.profile_id is None for u in users if u.user_id == "NAOEXISTE")
    else:
        assert await rows(factory, UserSession) == []
        assert await rows(factory, ActivityLog) == []


async def test_session_identity_has_profile_and_only_allowed_active_permissions(factory):
    session_id = await start(factory, identity())

    async with factory() as db:
        found = await AuthRepository(db).find_session_identity(session_id)

    assert found["profile_name"] == "administrador"
    assert found["cav4_user_id"] == "GFZ3"
    assert found["email"] == "ana@petrobras.com.br"
    assert found["display_name"] == "Ana"
    assert found["db_permissions"] == ["projeto.visualizar"]


async def test_session_identity_ignores_expired_sessions(factory):
    async with factory() as db:
        db.add(UserSession(id="velha", user_id="GFZ3", profile_id="ADM", profile_data={}, expires_at=datetime(2000, 1, 1)))  # noqa: DTZ001 - sessions.expires_at é sem fuso
        await db.commit()
    async with factory() as db:
        assert await AuthRepository(db).find_session_identity("velha") is None
        assert await AuthRepository(db).find_session_identity("inexistente") is None


async def test_end_removes_only_that_session(factory):
    session_id = await start(factory, identity())
    other = await start(factory, identity(user_login="ana@petrobras.com.br", subject="s"))
    async with factory() as db:
        await Cav4SessionService(AuthRepository(db)).end(session_id)
    assert [s.id for s in await rows(factory, UserSession)] == [other]


@pytest_asyncio.fixture
async def client(factory, monkeypatch) -> AsyncIterator[httpx.AsyncClient]:
    async def service() -> AsyncIterator[Cav4SessionService]:
        async with factory() as db:
            yield Cav4SessionService(AuthRepository(db))

    async def sessions():
        async with factory() as db:
            yield db

    monkeypatch.setattr(settings, "cav4_enabled", True)
    monkeypatch.setattr(settings, "temporary_cav4_session", False)
    monkeypatch.setattr(dependencies, "get_session", sessions)
    app.dependency_overrides[cav4_auth.get_cav4_session_service] = service
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as http:
        yield http
    app.dependency_overrides.pop(cav4_auth.get_cav4_session_service, None)


def callback(client, nonce="nonce-1", next_path="/projetos", cookie_nonce=None):
    # next_path vai embutido no state OAuth e no cookie, conforme _pack_state_nonce.
    packed = f"{nonce}|{next_path}"
    state = base64.urlsafe_b64encode(
        json.dumps({"state": packed}).encode()
    ).decode().rstrip("=")
    cookie = f"cav4_oauth_state={cookie_nonce or packed}"
    return client.get("/api/auth/cav4/callback", params={"code": "abc", "state": state}, headers={"cookie": cookie})


class FakeProvider:
    def __init__(self, ident: CAV4Identity) -> None:
        self.ident = ident

    async def exchange_callback(self, *, code: str, state: str) -> CAV4Identity:
        return self.ident


async def test_callback_sets_cookie_redirects_and_creates_session(client, factory, monkeypatch):
    monkeypatch.setattr(cav4_auth, "get_cav4_provider", lambda: FakeProvider(identity()))

    response = await callback(client)

    assert response.status_code == 302
    assert response.headers["location"] == f"{settings.frontend_url}/projetos"
    (session,) = await rows(factory, UserSession)
    assert f"{settings.cookie_name}={session.id}" in response.headers["set-cookie"]


async def test_callback_rejects_mismatched_state(client, factory, monkeypatch):
    monkeypatch.setattr(cav4_auth, "get_cav4_provider", lambda: FakeProvider(identity()))

    response = await callback(client, nonce="nonce-1", cookie_nonce="outro")

    assert response.status_code == 400
    assert await rows(factory, UserSession) == []


async def test_callback_returns_403_for_unregistered_user_without_profile(client, factory, monkeypatch):
    """Usuário novo no CAV4 é criado automaticamente, mas sem perfil (roles não batem com profiles) => 403."""
    monkeypatch.setattr(cav4_auth, "get_cav4_provider", lambda: FakeProvider(identity(user_login="NAOEXISTE", subject="x", email="x@y.com", roles=("DESCONHECIDO",))))

    response = await callback(client)

    assert response.status_code == 403
    # A sessão não é criada porque o usuário ficou sem perfil
    assert await rows(factory, UserSession) == []
    # Mas o registro na tabela users foi criado automaticamente
    users = await rows(factory, User)
    assert any(u.user_id == "NAOEXISTE" for u in users)


async def test_session_endpoint_returns_the_authenticated_user(client, monkeypatch):
    monkeypatch.setattr(cav4_auth, "get_cav4_provider", lambda: FakeProvider(identity()))
    login = await callback(client)
    session_id = login.headers["set-cookie"].split(f"{settings.cookie_name}=")[1].split(";")[0]

    response = await client.get("/api/auth/cav4/session", headers={"cookie": f"{settings.cookie_name}={session_id}"})

    user = response.json()["user"]
    assert response.status_code == 200
    assert user["role"] == "admin"
    assert user["email"] == "ana@petrobras.com.br"
    assert "projeto.visualizar" in user["permissions"]


async def test_session_endpoint_without_cookie_returns_no_user(client):
    response = await client.get("/api/auth/cav4/session")
    assert response.json() == {"user": None}


async def test_logout_revokes_session_and_clears_cookie(client, factory, monkeypatch):
    monkeypatch.setattr(cav4_auth, "get_cav4_provider", lambda: FakeProvider(identity()))
    login = await callback(client)
    session_id = login.headers["set-cookie"].split(f"{settings.cookie_name}=")[1].split(";")[0]

    response = await client.post("/api/auth/cav4/logout", headers={"cookie": f"{settings.cookie_name}={session_id}"})

    assert response.status_code == 204
    assert await rows(factory, UserSession) == []
    assert f'{settings.cookie_name}=""' in response.headers["set-cookie"] or "Max-Age=0" in response.headers["set-cookie"]
