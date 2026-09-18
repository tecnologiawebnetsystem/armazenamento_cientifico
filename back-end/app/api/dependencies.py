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
                        "select u.*, p.id as profile_id, p.name as profile_name, "
                        "coalesce(array_agg(distinct perm.id) filter (where pp.allowed = true and perm.active = true), '{}') as db_permissions "
                        "from sessions s join users u on u.id=s.user_id "
                        "left join profiles p on p.id=u.profile_id "
                        "left join profile_permissions pp on pp.profile_id=p.id "
                        "left join permissions perm on perm.id=pp.permission_id "
                        "where s.id=:session_id and s.expires_at > now() "
                        "group by u.id, p.id, p.name"
                    ),
                    {"session_id": session_id},
                ).mappings().first()
            )

    if not user:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada")

    cav4_roles = list(user.get("roles") or [])
    if not cav4_roles and user.get("role"):
        cav4_roles = [str(user["role"])]
    resolved_role = resolve_cav4_role(cav4_roles)
    if resolved_role is None:
        raise HTTPException(status_code=403, detail="Usuário sem papel SIGAC atribuído no CAV4")
    database_permissions = set(user.get("db_permissions") or [])
    fallback_permissions = set(role_capabilities(resolved_role))
    effective_permissions = sorted(database_permissions or fallback_permissions)
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
        "perfilNome": user.get("profile_name"),
        "criadoEm": user.get("created_at"),
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
