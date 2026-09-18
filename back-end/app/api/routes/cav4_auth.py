from datetime import UTC, datetime, timedelta
from secrets import compare_digest
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse, Response
from sqlalchemy import text

from app.core.authorization import resolve_cav4_role
from app.core.cav4 import CAV4AuthenticationError, decode_state_nonce, get_cav4_provider
from app.core.config import settings
from app.core.temporary_sessions import create_session, delete_session
from app.api.dependencies import get_current_user
from app.db.session import get_session
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth/cav4", tags=["Authentication"])


@router.get("/session", include_in_schema=True)
async def cav4_session(request: Request):
    """Retorna a identidade autenticada e suas permissões efetivas."""
    try:
        user = await get_current_user(request)
    except HTTPException as exc:
        if exc.status_code == 401:
            return {"user": None}
        raise
    logger.info(
        "cav4_session_authenticated user_id=%s email=%s role=%s roles=%s permissions=%s groups=%s",
        user.get("id"),
        user.get("email"),
        user.get("role"),
        user.get("roles", []),
        user.get("permissions", []),
        user.get("groups", []),
    )
    return {"user": dict(user)}


@router.post("/logout", status_code=204)
async def cav4_logout(request: Request):
    session_id = request.cookies.get(settings.cookie_name)
    if session_id:
        if settings.temporary_cav4_session:
            delete_session(session_id)
        else:
            async for database in get_session():
                await database.execute(text("delete from sessions where id=:session_id"), {"session_id": session_id})
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
    if not identity.subject or not identity.email:
        raise HTTPException(status_code=401, detail="Claims obrigatórias ausentes no token CAV4")
    resolved_role = resolve_cav4_role(list(identity.roles))
    if resolved_role is None:
        raise HTTPException(status_code=403, detail="Usuário sem papel SIGAC atribuído no CAV4")

    if settings.temporary_cav4_session:
        session_id, expires_at = create_session(identity)
    else:
        session_id = str(uuid4())
        expires_at = datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=settings.session_hours)
        async for database in get_session():
            user = (
                await database.execute(
                    text("select id from users where lower(email)=lower(:email)"),
                    {"email": identity.email},
                )
            ).mappings().first()
            if not user:
                raise HTTPException(status_code=403, detail="Usuário CAV4 não cadastrado na plataforma")
            await database.execute(text("update users set role=:role where id=:user_id"), {"role": resolved_role, "user_id": user["id"]})
            await database.execute(text("delete from sessions where user_id=:user_id"), {"user_id": user["id"]})
            await database.execute(
                text("insert into sessions(id,user_id,expires_at) values(:id,:user_id,:expires_at)"),
                {"id": session_id, "user_id": user["id"], "expires_at": expires_at.replace(tzinfo=None)},
            )
            await database.commit()
    safe_next = next_path if next_path.startswith("/") and not next_path.startswith("//") else "/dashboard"
    redirect_url = f"{settings.frontend_url}{safe_next}"
    logger.info(
        "cav4_authentication_ok subject=%s email=%s roles=%s permissions=%s",
        identity.subject,
        identity.email,
        list(identity.roles),
        list(identity.permissions),
    )
    response = RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)
    response.delete_cookie("cav4_oauth_state")
    response.set_cookie(settings.cookie_name, session_id, httponly=True, secure=settings.cookie_secure, samesite="lax", max_age=settings.session_hours * 3600)
    return response
