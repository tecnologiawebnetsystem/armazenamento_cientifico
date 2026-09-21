import logging
from time import perf_counter

from fastapi import APIRouter, HTTPException, Request, status

from app.api.dependencies import get_current_user
from app.infrastructure.cav4 import CAV4AuthenticationError, CAV4OIDCProvider
from app.core.config import settings
from app.core.temporary_sessions import get_session_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/cav4", tags=["CAV4 Directory"])


async def _consult_user_data(request: Request, user_login: str, endpoint_template: str):
    await get_current_user(request)
    if not settings.temporary_cav4_session:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Consultas CAV4 exigem sessão temporária com token de acesso; implemente armazenamento seguro do token para o modo Aurora.",
        )
    session_id = request.cookies.get(settings.cookie_name)
    session = get_session_user(session_id or "")
    access_token = session.get("cav4_access_token") if session else None
    if not access_token:
        raise HTTPException(status_code=401, detail="Token de acesso CAV4 não disponível na sessão")

    endpoint = endpoint_template.format(userLogin=user_login)
    started_at = perf_counter()
    logger.info("cav4_directory_query_start endpoint=%s user_login=%s", endpoint, user_login)
    try:
        payload = await CAV4OIDCProvider().get_user_data(access_token=access_token, endpoint=endpoint)
    except CAV4AuthenticationError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    elapsed_ms = (perf_counter() - started_at) * 1000
    return {"endpoint": endpoint, "duration_ms": round(elapsed_ms, 2), "data": payload}


@router.get("/api/users/{userLogin}/user-groups")
async def user_groups(request: Request, userLogin: str):
    return await _consult_user_data(request, userLogin, "/api/users/{userLogin}/user-groups")


@router.get("/api/users/{userLogin}/information-values")
async def information_values(request: Request, userLogin: str):
    return await _consult_user_data(request, userLogin, "/api/users/{userLogin}/information-values")


@router.get("/api/admin/users/{userLogin}")
async def admin_user(request: Request, userLogin: str):
    return await _consult_user_data(request, userLogin, "/api/admin/users/{userLogin}")


@router.get("/api/admin/users/{userLogin}/enterprise-groups")
async def enterprise_groups(request: Request, userLogin: str):
    return await _consult_user_data(request, userLogin, "/api/admin/users/{userLogin}/enterprise-groups")


@router.get("/api/admin/users/{userLogin}/roles")
async def user_roles(request: Request, userLogin: str):
    return await _consult_user_data(request, userLogin, "/api/admin/users/{userLogin}/roles")
