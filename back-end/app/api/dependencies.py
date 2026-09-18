from typing import Annotated

from fastapi import Depends, HTTPException, Request

from sqlalchemy import text

from app.core.authorization import ensure_role, require_capability, resolve_cav4_role, role_capabilities
from app.core.config import settings
from app.core.temporary_sessions import get_session_user
from app.db.session import get_session


async def get_current_user(request: Request):
    session_id = request.cookies.get(settings.cookie_name)
    if not session_id:
        raise HTTPException(status_code=401, detail="Sessão ausente")
    if settings.temporary_cav4_session:
        user = get_session_user(session_id)
    else:
        async for database in get_session():
            user = (
                await database.execute(
                    text(
                        "select u.* from sessions s join users u on u.id=s.user_id "
                        "where s.id=:session_id and s.expires_at > now()"
                    ),
                    {"session_id": session_id},
                )
            ).mappings().first()
    if not user:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada")

    cav4_roles = list(user.get("roles") or [])
    if not cav4_roles and user.get("role"):
        cav4_roles = [str(user["role"])]
    resolved_role = resolve_cav4_role(cav4_roles)
    if resolved_role is None:
        raise HTTPException(status_code=403, detail="Usuário sem papel SIGAC atribuído no CAV4")
    claimed_permissions = set(user.get("permissions") or [])
    effective_permissions = sorted((claimed_permissions or set(role_capabilities(resolved_role))) & set(role_capabilities(resolved_role)))
    return {
        **dict(user),
        "role": resolved_role,
        "roles": cav4_roles,
        "permissions": effective_permissions,
        "nome": user.get("name"),
        "cargo": user.get("job_title"),
        "area": user.get("area"),
        "avatarUrl": user.get("avatar_url"),
        "ultimoLogin": user.get("last_login_at"),
        "perfilId": user.get("profile_id"),
        "criadoEm": user.get("created_at"),
        "roles": [normalized_role],
        "permissions": sorted(role_capabilities(normalized_role)),
        "groups": [],
    }


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
