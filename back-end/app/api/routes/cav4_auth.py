import json
import logging
import re
from datetime import UTC, datetime, timedelta

from secrets import compare_digest
from urllib.parse import quote
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse, Response
from sqlalchemy import bindparam, text
from sqlalchemy.exc import DBAPIError, SQLAlchemyError

from app.api.dependencies import get_current_user
from app.core.authorization import canonical_role
from app.core.config import settings
from app.core.temporary_sessions import delete_session
from app.db.session import get_session
from app.infrastructure.cav4 import CAV4AuthenticationError, decode_state_nonce, get_cav4_provider

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth/cav4", tags=["Authentication"])
email_router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _schema_name() -> str:
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", settings.db_schema):
        raise RuntimeError("DB_SCHEMA inválido ou ausente")
    return f'"{settings.db_schema}"'


@email_router.get("/health/database", tags=["Diagnostics"])
async def database_health():
    """Diagnóstico sanitizado da conexão e das tabelas essenciais."""
    try:
        async for database in get_session():
            _schema_name()
            result = await database.execute(
                text(
                    "select current_schema(), to_regclass(:users_table)"
                ),
                {"users_table": f"{settings.db_schema}.users"},
            )
            schema_name, users_table = result.one()
            if users_table is None:
                return {
                    "ok": False,
                    "code": "SCHEMA_NOT_INITIALIZED",
                    "schema": schema_name,
                    "users_table": False,
                }
            return {
                "ok": True,
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
    logger.info(
        "cav4_roles_received email=%s roles=%s",
        identity.email,
        [str(role) for role in identity.roles if role],
    )
    solicitante_role = next((role for role in identity.roles if canonical_role(role) == "solicitante"), None)
    profile_id = solicitante_role or next((role for role in identity.roles if canonical_role(role)), None)
    if not profile_id:
        raise HTTPException(status_code=403, detail="Usuário CAV4 sem perfil corporativo configurado")
    if solicitante_role:
        message = "Seu perfil de Solicitante no CAV4 não tem permissão para acessar o Dashboard SIGAC."
        login_url = f"{settings.frontend_url.rstrip('/')}/login?auth_error={quote(message)}&next={quote(next_path or '/dashboard', safe='')}"
        logger.info("cav4_access_denied_redirect role=%s frontend=%s", profile_id, settings.frontend_url)
        return RedirectResponse(
            url=login_url,
            status_code=status.HTTP_303_SEE_OTHER,
        )

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
            # O `sub` do CAV4 pode ser o e-mail (como ocorre em alguns
            # clientes), enquanto o cadastro do SIGAC usa o login corporativo.
            # Prioriza o login explícito e mantém o subject como fallback para
            # compatibilidade com cadastros antigos.
            cav4_identifiers = tuple(
                dict.fromkeys(
                    identifier
                    for identifier in (identity.user_login, identity.subject, identity.email)
                    if identifier
                )
            )
            local_user_result = await database.execute(
                text(
                    f"select id, user_id from {schema}.users "
                    "where user_id in :user_ids "
                    "order by case user_id "
                    "when :user_login then 0 "
                    "when :subject then 1 "
                    "else 2 end limit 1"
                ).bindparams(bindparam("user_ids", expanding=True)),
                {
                    "user_ids": list(cav4_identifiers),
                    "user_login": identity.user_login or "",
                    "subject": identity.subject,
                },
            )
            local_user = local_user_result.mappings().first()
            if not local_user:
                raise HTTPException(
                    status_code=403,
                    detail=f"Usuário CAV4 não cadastrado no SIGAC: {identity.user_login or identity.subject}",
                )
            claims = identity.raw_claims or {}
            def claim(*names: str) -> str | None:
                for name in names:
                    value = claims.get(name)
                    if value is not None and str(value).strip():
                        return str(value).strip()
                return None

            profile_data = {
                # O login funcional (ex.: GFZ3) é a identidade usada pela auditoria.
                "cav4_user_id": identity.user_login,
                "user_login": identity.user_login,
                "email": identity.email,
                "display_name": identity.display_name or claim("name", "display_name", "displayName", "full_name", "fullName", "nome", "nomeCompleto"),
                "job_title": claim("job_title", "jobTitle", "cargo", "title", "occupation"),
                "area": claim("area", "department", "departmentName", "organizational_unit", "organizationalUnit"),
                "avatar_url": claim("picture", "avatar", "avatar_url", "photo", "photo_url"),
            }
            await database.execute(
                text(f"delete from {schema}.sessions where user_id=:user_id"),
                {"user_id": local_user["user_id"]},
            )
            await database.execute(
                text(f"update {schema}.users set last_login_at=now() where id=:user_id"),
                {"user_id": local_user["id"]},
            )
            await database.execute(
                text(f"""insert into {schema}.sessions
                    (id,user_id,profile_id,profile_data,expires_at)
                    values(:id,:user_id,:profile_id,:profile_data,:expires_at)"""),
                {
                    "id": session_id,
                    "user_id": local_user["user_id"],
                    "profile_id": str(profile_id),
                    # A rota usa SQL textual; o driver asyncpg precisa receber JSON serializado.
                    "profile_data": json.dumps(profile_data, ensure_ascii=False),
                    "expires_at": expires_at,
                },
            )
            await database.execute(
                text(f"""insert into {schema}.activity_logs
                    (id,user_id,action,entity,entity_id,details,result,created_at)
                    values(:id,:user_id,:action,:entity,:entity_id,:details,:result,now())"""),
                {
                    "id": str(uuid4()),
                    "user_id": local_user["user_id"],
                    "action": "login",
                    "entity": "session",
                    "entity_id": session_id,
                    "details": json.dumps({"provider": "CAV4", "subject": identity.subject}, ensure_ascii=False),
                    "result": "success",
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
