import logging
from typing import Annotated

from fastapi import Depends, HTTPException, Request

from app.core.authorization import ensure_role, require_capability
from app.core.config import settings
from app.db.session import get_session
from app.modules.auth.repository import AuthRepository
from app.modules.auth.service import CurrentUserService

logger = logging.getLogger(__name__)


async def get_current_user(request: Request):
    session_id = request.cookies.get(settings.cookie_name)
    if not session_id:
        raise HTTPException(status_code=401, detail="Sessão ausente")

    if settings.temporary_cav4_session:
        service = CurrentUserService(temporary=True)
        user = await service.get(session_id)
    else:
        async for database in get_session():
            service = CurrentUserService(
                repository=AuthRepository(database, settings.db_schema),
                temporary=False,
            )
            user = await service.get(session_id)

    logger.info(
        "auth_session_lookup_ok user_id=%s email=%s profile_id=%s profile_name=%s permissions_count=%s",
        user.get("id"), user.get("email"), user.get("profile_id"),
        user.get("profile_name"), len(user.get("permissions") or []),
    )
    return user


def require_roles(*roles: str):
    async def dependency(user: Annotated[dict, Depends(get_current_user)]):
        if roles:
            ensure_role(user, *roles)
        return user

    return dependency


def require_capabilities(*capabilities: str):
    async def dependency(user: Annotated[dict, Depends(get_current_user)]):
        for capability in capabilities:
            require_capability(user, capability)
        return user

    return dependency


CurrentUser = Annotated[object, Depends(get_current_user)]
