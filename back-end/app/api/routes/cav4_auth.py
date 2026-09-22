import logging
import re
from datetime import UTC, datetime, timedelta
from secrets import compare_digest
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse, Response
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, SQLAlchemyError

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.core.temporary_sessions import delete_session
from app.db.session import get_session
from app.infrastructure.cav4 import CAV4AuthenticationError, decode_state_nonce, get_cav4_provider
from app.modules.auth.repository import AuthRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth/cav4", tags=["Authentication"])
email_router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _schema_name() -> str:
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", settings.db_schema):
        raise RuntimeError("DB_SCHEMA inválido ou ausente")
    return f'"{settings.db_schema}"'


@email_router.post("/login")
async def email_login(request: Request):
    """Login auxiliar por e-mail (botão "Entrar com e-mail").

    Controlado por EMAIL_LOGIN_ENABLED (padrão: ligado fora de produção). A
    autenticação e a sessão continuam 100% dirigidas pelo banco: o e-mail é
    buscado em `users`, o perfil precisa existir e a sessão é persistida em
    `sessions`. Perfil, permissões e menus são resolvidos depois pelo Aurora.
    """
    if not settings.email_login_enabled:
        raise HTTPException(status_code=404, detail="Login por e-mail não está habilitado neste ambiente")
    payload = await request.json()
    email = str(payload.get("email", "")).strip().lower()
    if not email:
        raise HTTPException(status_code=422, detail="Informe um e-mail válido")
    session_id = str(uuid4())
    expires_at = datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=settings.session_hours)
    async for database in get_session():
        repository = AuthRepository(database, settings.db_schema)
        user = await repository.find_user_by_email(email)
        if not user:
            raise HTTPException(status_code=403, detail="Usuário não cadastrado na plataforma")
        if not user.get("profile_id"):
            raise HTTPException(status_code=403, detail="Usuário sem perfil configurado no banco de dados")
        await repository.create_session(user["id"], session_id, expires_at, email)
    response = Response(status_code=204)
    response.set_cookie(settings.cookie_name, session_id, httponly=True, secure=settings.cookie_secure, samesite="lax", max_age=settings.session_hours * 3600)
    return response


@email_router.get("/health/database", tags=["Diagnostics"])
async def database_health():
    """Diagnóstico sanitizado da conexão e das tabelas essenciais."""
    try:
        async for database in get_session():
            _schema_name()
            result = await database.execute(
                text(
                    f"select current_database(), current_user, current_schema(), "
                    f"to_regclass('{settings.db_schema}.users')"
                )
            )
            database_name, database_user, schema_name, users_table = result.one()
            if users_table is None:
                return {
                    "ok": False,
                    "code": "SCHEMA_NOT_INITIALIZED",
                    "database": database_name,
                    "schema": schema_name,
                    "users_table": False,
                }
            return {
                "ok": True,
                "database": database_name,
                "user": database_user,
                "schema": schema_name,
                "users_table": True,
            }
    except SQLAlchemyError as exc:
        error_id = uuid4().hex[:12]
        original = exc.orig if isinstance(exc, DBAPIError) else exc
        logger.exception(
            "database_health_failed error_id=%s db_error_type=%s db_error=%s",
            error_id,
            type(original).__name__,
            str(original).splitlines()[0][:240],
        )
        return {"ok": False, "code": "DATABASE_UNAVAILABLE", "error_id": error_id}


@email_router.get("/session", include_in_schema=True)
@router.get("/session", include_in_schema=True)
async def cav4_session(request: Request):
    """Retorna a identidade autenticada e suas permissões efetivas."""
    try:
        user = await get_current_user(request)
    except HTTPException as exc:
        if exc.status_code == 401:
            return {"user": None}
        raise
    except SQLAlchemyError as exc:
        error_id = uuid4().hex[:12]
        original = exc.orig if isinstance(exc, DBAPIError) else exc
        logger.exception(
            "auth_session_failed error_id=%s db_error_type=%s db_error=%s",
            error_id,
            type(original).__name__,
            str(original).splitlines()[0][:240],
        )
        raise HTTPException(
            status_code=503,
            detail={"code": "SESSION_DATABASE_ERROR", "error_id": error_id, "message": "Não foi possível ler a sessão"},
        ) from exc
    logger.info(
        "cav4_session_authenticated user_id=%s email=%s role=%s",
        user.get("id"),
        user.get("email"),
        user.get("role"),
    )
    return {"user": dict(user)}


@email_router.post("/logout", status_code=204)
@router.post("/logout", status_code=204)
async def cav4_logout(request: Request):
    session_id = request.cookies.get(settings.cookie_name)
    if session_id:
        if settings.temporary_cav4_session:
            delete_session(session_id)
        else:
            schema = _schema_name()
            async for database in get_session():
                await database.execute(text(f"delete from {schema}.sessions where id=:session_id"), {"session_id": session_id})
                await database.commit()
        logger.info("cav4_logout session_revoked=true backend=%s", "memory" if settings.temporary_cav4_session else "database")
    response = Response(status_code=204)
    response.delete_cookie(settings.cookie_name)
    return response


@router.get("/start")
async def start_cav4_login(next: str = Query(default="/dashboard", max_length=512)):
    """Inicia o login CAV4 e vincula o callback à sessão do navegador."""
    if not settings.cav4_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "CAV4_NOT_CONFIGURED", "message": "Login corporativo CAV4 ainda não configurado."},
        )
    safe_next = next if next.startswith("/") and not next.startswith("//") else "/dashboard"
    nonce = str(uuid4())
    try:
        url = await get_cav4_provider().build_login_url(
            state=nonce,
            redirect_uri=settings.cav4_redirect_uri,
        )
    except CAV4AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    response = RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)
    response.set_cookie(
        "cav4_oauth_state",
        f"{nonce}|{safe_next}",
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=600,
    )
    return response


@router.get("/callback")
async def cav4_callback(request: Request, code: str, state: str):
    """Valida o callback, cria sessão HttpOnly e retorna ao frontend."""
    logger.info(
        "cav4_callback_start code_present=%s state_present=%s cookie_present=%s",
        bool(code),
        bool(state),
        bool(request.cookies.get("cav4_oauth_state")),
    )
    if not settings.cav4_enabled:
        raise HTTPException(status_code=503, detail={"code": "CAV4_NOT_CONFIGURED"})
    expected_cookie = request.cookies.get("cav4_oauth_state", "")
    expected_nonce, separator, next_path = expected_cookie.partition("|")
    try:
        returned_nonce = decode_state_nonce(state)
    except CAV4AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not separator or not expected_nonce or not compare_digest(returned_nonce, expected_nonce):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Callback CAV4 inválido")
    try:
        identity = await get_cav4_provider().exchange_callback(code=code, state=state)
    except CAV4AuthenticationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    # O CAV4 fornece a identidade e o código do perfil. O SIGAC usa apenas
    # o perfil local para carregar menus e permissões; não exige um usuário local.
    if not identity.email:
        raise HTTPException(status_code=401, detail="E-mail ausente na autenticação corporativa")
    profile_id = next((role for role in identity.roles if role), None)
    if not profile_id:
        raise HTTPException(status_code=403, detail="Usuário CAV4 sem perfil corporativo configurado")

    session_id = str(uuid4())
    expires_at = datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=settings.session_hours)
    try:
        schema = _schema_name()
        async for database in get_session():
            profile_result = await database.execute(
                text(f"select id from {schema}.profiles where id=:profile_id"),
                {"profile_id": profile_id},
            )
            profile = profile_result.mappings().first()
            if not profile:
                raise HTTPException(status_code=403, detail=f"Perfil CAV4 não cadastrado no SIGAC: {profile_id}")
            user_result = await database.execute(
                text(f"select id from {schema}.users where lower(email)=lower(:email)"),
                {"email": identity.email},
            )
            local_user = user_result.mappings().first()
            if not local_user:
                raise HTTPException(status_code=403, detail="Usuário CAV4 não cadastrado no SIGAC")
            user_id = str(local_user["id"])
            await database.execute(text(f"delete from {schema}.sessions where user_id=:user_id"), {"user_id": user_id})
            await database.execute(
                text(f"""insert into {schema}.sessions
                    (id,user_id,email,profile_id,expires_at,cav4_subject)
                    values(:id,:user_id,:email,:profile_id,:expires_at,:cav4_subject)"""),
                {
                    "id": session_id,
                    "user_id": user_id,
                    "email": identity.email,
                    "profile_id": profile_id,
                    "expires_at": expires_at,
                    "cav4_subject": identity.user_login or identity.subject or identity.email,
                },
            )
            await database.commit()
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        error_id = uuid4().hex[:12]
        original = exc.orig if isinstance(exc, DBAPIError) else exc
        logger.exception(
            "cav4_authentication_failed error_id=%s db_error_type=%s db_error=%s",
            error_id,
            type(original).__name__,
            str(original).splitlines()[0][:240],
        )
        raise HTTPException(
            status_code=503,
            detail=f"Banco de dados indisponível para concluir o login. Consulte o log pelo código {error_id}.",
        ) from exc
    safe_next = next_path if next_path.startswith("/") and not next_path.startswith("//") else "/dashboard"
    redirect_url = f"{settings.frontend_url}{safe_next}"
    logger.info(
        "cav4_authentication_ok subject=%s email=%s",
        identity.subject,
        identity.email,
    )
    response = RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)
    response.delete_cookie("cav4_oauth_state")
    response.set_cookie(settings.cookie_name, session_id, httponly=True, secure=settings.cookie_secure, samesite="lax", max_age=settings.session_hours * 3600)
    return response
