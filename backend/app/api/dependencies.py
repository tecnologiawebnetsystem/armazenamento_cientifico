from typing import Annotated

from fastapi import Depends, HTTPException, Request

from app.core.authorization import ensure_role, require_capability
from app.core.config import settings
from app.db.session import get_pool


async def get_current_user(request: Request):
    session_id = request.cookies.get(settings.cookie_name)
    if not session_id:
        raise HTTPException(status_code=401, detail="Sessão ausente")
    pool = await get_pool()
    user = await pool.fetchrow(
        "select u.* from sessions s join users u on u.id=s.user_id "
        "where s.id=$1 and s.expires_at > now()",
        session_id,
    )
    if not user:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada")
    return user


def require_roles(*roles: str):
    async def dependency(request: Request):
        user = await get_current_user(request)
        if roles:
            ensure_role(user, *roles)
        return user

    return dependency


def require_capabilities(*capabilities: str):
    async def dependency(request: Request):
        user = await get_current_user(request)
        for capability in capabilities:
            require_capability(user, capability)
        return user

    return dependency


CurrentUser = Annotated[object, Depends(get_current_user)]
