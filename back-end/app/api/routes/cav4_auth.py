from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse

from app.core.cav4 import CAV4AuthenticationError, get_cav4_provider
from app.core.config import settings
from app.db.session import get_pool

router = APIRouter(prefix="/api/auth/cav4", tags=["Authentication"])


@router.get("/start")
async def start_cav4_login(next: str = Query(default="/dashboard", max_length=512)):
    """Ponto de entrada do login CAV4; permanece bloqueado sem contrato/configuração."""
    if not settings.cav4_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "CAV4_NOT_CONFIGURED", "message": "Login corporativo CAV4 ainda não configurado."},
        )
    try:
        url = await get_cav4_provider().build_login_url(
            state=next,
            redirect_uri=settings.cav4_redirect_uri,
        )
    except CAV4AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)


@router.get("/callback")
async def cav4_callback(request: Request, code: str, state: str):
    """Valida o callback, cria sessão HttpOnly e retorna ao frontend."""
    if not settings.cav4_enabled:
        raise HTTPException(status_code=503, detail={"code": "CAV4_NOT_CONFIGURED"})
    try:
        identity = await get_cav4_provider().exchange_callback(code=code, state=state)
    except CAV4AuthenticationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if not identity.subject or not identity.email:
        raise HTTPException(status_code=401, detail="Claims obrigatórias ausentes no token CAV4")

    pool = await get_pool()
    user = await pool.fetchrow("select * from users where lower(email)=lower($1)", identity.email)
    if not user:
        raise HTTPException(status_code=403, detail="Usuário CAV4 não cadastrado na plataforma")
    session_id = str(uuid4())
    await pool.execute("delete from sessions where user_id=$1", user["id"])
    await pool.execute(
        "insert into sessions(id,user_id,expires_at) values($1,$2,$3)",
        session_id, user["id"], datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=settings.session_hours),
    )
    response = RedirectResponse(url="/dashboard", status_code=status.HTTP_302_FOUND)
    response.set_cookie(settings.cookie_name, session_id, httponly=True, secure=settings.cookie_secure, samesite="lax", max_age=settings.session_hours * 3600)
    return response
