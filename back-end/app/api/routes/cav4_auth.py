from fastapi import APIRouter, HTTPException, Query, status

from app.core.cav4 import CAV4AuthenticationError, get_cav4_provider
from app.core.config import settings

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
    return {"authorization_url": url}


@router.get("/callback")
async def cav4_callback(code: str, state: str):
    """Callback reservado para a troca segura do código pelo provedor CAV4."""
    if not settings.cav4_enabled:
        raise HTTPException(status_code=503, detail={"code": "CAV4_NOT_CONFIGURED"})
    try:
        identity = await get_cav4_provider().exchange_callback(code=code, state=state)
    except CAV4AuthenticationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"status": "identity_received", "subject": identity.subject, "email": identity.email}
