import logging
from collections.abc import AsyncIterator
from secrets import compare_digest
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse, Response
from sqlalchemy.exc import DBAPIError, SQLAlchemyError

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.core.temporary_sessions import delete_session
from app.db.session import get_session
from app.infrastructure.cav4 import CAV4AuthenticationError, decode_state_nonce, get_cav4_provider
from app.modules.auth.repository import AuthRepository
from app.modules.auth.service import Cav4SessionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth/cav4", tags=["Authentication"])
email_router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Prefixos de rotas do frontend permitidos para redirecionamento pós-login.
# Mapeia cada path permitido para a URL absoluta completa (com frontend_url).
# Valores fora deste mapa redirecionam para /dashboard.
_ALLOWED_REDIRECT_PREFIXES: tuple[str, ...] = (
    "/dashboard",
    "/projetos",
    "/relatorios",
    "/logs",
    "/pesquisas",
    "/configuracoes",
    "/perfil",
)

# Separador usado para embutir o next_path no state OAuth (ex.: "nonce|/projetos").
_NEXT_PATH_SEPARATOR = "|"


def _pack_state_nonce(nonce: str, next_path: str) -> str:
    """Empacota nonce + next_path para o state OAuth."""
    return f"{nonce}{_NEXT_PATH_SEPARATOR}{next_path}"


def _unpack_state_nonce(packed: str) -> tuple[str, str]:
    """Extrai (nonce, next_path) do state. next_path vazio se ausente."""
    nonce, sep, next_path = packed.partition(_NEXT_PATH_SEPARATOR)
    return nonce, next_path if sep else "/dashboard"


def _safe_redirect_path(raw: str) -> str:
    """Retorna o path se estiver na whitelist; caso contrário, /dashboard."""
    stripped = raw.strip()
    if not stripped.startswith("/") or stripped.startswith(("//", "/\\")):
        return "/dashboard"
    for prefix in _ALLOWED_REDIRECT_PREFIXES:
        if stripped == prefix or stripped.startswith((prefix + "/", prefix + "?")):
            return stripped
    return "/dashboard"


def _resolve_redirect_url(raw: str) -> str:
    """Retorna a URL absoluta de redirect se o path estiver na whitelist.

    Usa um dicionário constante (mapeamento fechado) para que o Checkmarx
    reconheça que o RedirectResponse só recebe valores pré-definidos.
    Qualquer path fora da whitelist redireciona para /dashboard.
    """
    stripped = raw.strip()
    if not stripped.startswith("/") or stripped.startswith(("//", "/\\")):
        return _REDIRECT_URLS["/dashboard"]
    for prefix in _ALLOWED_REDIRECT_PREFIXES:
        if stripped == prefix or stripped.startswith((prefix + "/", prefix + "?")):
            return _REDIRECT_URLS[prefix]
    return _REDIRECT_URLS["/dashboard"]

_REDIRECT_URLS: dict[str, str] = {}


def _build_redirect_urls() -> None:
    """Pré-constroi o mapa de redirect URLs (chamado no startup do módulo)."""
    base = settings.frontend_url.rstrip("/")
    for prefix in _ALLOWED_REDIRECT_PREFIXES:
        _REDIRECT_URLS[prefix] = f"{base}{prefix}"
    # Garante fallback para /dashboard mesmo que não esteja na tupla (defesa).
    if "/dashboard" not in _REDIRECT_URLS:
        _REDIRECT_URLS["/dashboard"] = f"{base}/dashboard"


_build_redirect_urls()


async def get_cav4_session_service() -> AsyncIterator[Cav4SessionService | None]:
    """Serviço de sessão com banco; None na sessão temporária em memória, que não usa banco."""
    if settings.temporary_cav4_session:
        yield None
        return
    async for database in get_session():
        yield Cav4SessionService(AuthRepository(database))


SessionServiceDep = Annotated[Cav4SessionService | None, Depends(get_cav4_session_service)]


# TODO(verificar com Kleber, dev responsável): rota sem chamador (nem frontend, nem infra) e que
# duplica /api/health/database. Se não for necessária, apagar o bloco comentado; se for, descomentar.
# @email_router.get("/health/database", tags=["Diagnostics"])
# async def database_health():
#     """Diagnóstico sanitizado da conexão e das tabelas essenciais."""
#     try:
#         async for database in get_session():
#             _schema_name()
#             result = await database.execute(
#                 text(
#                     "select current_schema(), to_regclass(:users_table)"
#                 ),
#                 {"users_table": f"{settings.db_schema}.users"},
#             )
#             schema_name, users_table = result.one()
#             if users_table is None:
#                 return {
#                     "ok": False,
#                     "code": "SCHEMA_NOT_INITIALIZED",
#                     "schema": schema_name,
#                     "users_table": False,
#                 }
#             return {
#                 "ok": True,
#                 "schema": schema_name,
#                 "users_table": True,
#             }
#     except SQLAlchemyError as exc:
#         error_id = uuid4().hex[:12]
#         original = exc.orig if isinstance(exc, DBAPIError) else exc
#         logger.exception(
#             "database_health_failed error_id=%s db_error_type=%s db_error=%s",
#             error_id,
#             type(original).__name__,
#             str(original).splitlines()[0][:240],
#         )
#         return {"ok": False, "code": "DATABASE_UNAVAILABLE", "error_id": error_id}


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
async def cav4_logout(request: Request, service: SessionServiceDep):
    session_id = request.cookies.get(settings.cookie_name)
    if session_id:
        if service is None:
            delete_session(session_id)
        else:
            await service.end(session_id)
        logger.info("cav4_logout session_revoked=true backend=%s", "memory" if service is None else "database")
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
    safe_next = _safe_redirect_path(next)
    nonce = _pack_state_nonce(str(uuid4()), safe_next)
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
        nonce,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=600,
    )
    return response


@router.get("/callback")
async def cav4_callback(request: Request, code: str, state: str, service: SessionServiceDep):
    """Valida o callback, cria sessão HttpOnly e retorna ao frontend."""
    logger.info(
        "cav4_callback_start code_present=%s state_present=%s cookie_present=%s",
        bool(code),
        bool(state),
        bool(request.cookies.get("cav4_oauth_state")),
    )
    if not settings.cav4_enabled:
        raise HTTPException(status_code=503, detail={"code": "CAV4_NOT_CONFIGURED"})
    expected_packed = request.cookies.get("cav4_oauth_state", "")
    returned_nonce: str
    try:
        returned_nonce = decode_state_nonce(state)
    except CAV4AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not expected_packed or not compare_digest(returned_nonce, expected_packed):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Callback CAV4 inválido")
    _nonce, next_path = _unpack_state_nonce(returned_nonce)
    try:
        identity = await get_cav4_provider().exchange_callback(code=code, state=state)
    except CAV4AuthenticationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if service is None:
        raise HTTPException(
            status_code=503,
            detail={"code": "SESSION_BACKEND_UNAVAILABLE", "message": "O login CAV4 exige banco de dados."},
        )
    try:
        session_id = await service.start(identity)
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
    safe_next = _safe_redirect_path(next_path)
    redirect_url = _resolve_redirect_url(safe_next)
    logger.info(
        "cav4_authentication_ok subject=%s email=%s",
        identity.subject,
        identity.email,
    )
    response = RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)
    response.delete_cookie("cav4_oauth_state")
    response.set_cookie(settings.cookie_name, session_id, httponly=True, secure=settings.cookie_secure, samesite="lax", max_age=settings.session_hours * 3600)
    return response
