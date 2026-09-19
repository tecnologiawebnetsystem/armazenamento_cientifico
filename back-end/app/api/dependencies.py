import logging
import re
from typing import Annotated

logger = logging.getLogger(__name__)

from fastapi import Depends, HTTPException, Request
from sqlalchemy import text

from app.core.authorization import (
    canonical_role,
    ensure_role,
    require_capability,
    role_capabilities,
)
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
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", settings.db_schema):
            raise HTTPException(status_code=500, detail="DB_SCHEMA inválido")
        schema = f'"{settings.db_schema}"'
        async for database in get_session():
            user_result = await database.execute(
                text(
                    f"select u.*, s.cav4_subject, p.id as profile_id, p.name as profile_name, "
                    f"coalesce(array_agg(distinct perm.id) filter (where pp.allowed = true and perm.active = true), '{{}}') as db_permissions "
                    f"from {schema}.sessions s join {schema}.users u on u.id=s.user_id "
                    f"left join {schema}.profiles p on p.id=u.profile_id "
                    f"left join {schema}.profile_permissions pp on pp.profile_id=p.id "
                    f"left join {schema}.permissions perm on perm.id=pp.permission_id "
                    f"where s.id=:session_id and s.expires_at > now() "
                    f"group by u.id, p.id, p.name"
                ),
                {"session_id": session_id},
            )
            user = user_result.mappings().first()

    if not user:
        logger.warning("auth_session_lookup_not_found session_present=true")
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada")

    logger.info(
        "auth_session_lookup_ok user_id=%s email=%s profile_id=%s profile_name=%s permissions_count=%s",
        user.get("id"),
        user.get("email"),
        user.get("profile_id"),
        user.get("profile_name"),
        len(user.get("db_permissions") or []),
    )
    database_role = user.get("profile_name") or user.get("role")
    if not database_role:
        raise HTTPException(status_code=403, detail="Usuário autenticado sem perfil SIGAC configurado no banco de dados")
    database_permissions = set(user.get("db_permissions") or [])
    fallback_permissions = set(role_capabilities(database_role))
    effective_permissions = sorted(
        fallback_permissions if settings.temporary_cav4_session else database_permissions
    )
    return {
        **dict(user),
        "role": canonical_role(database_role),
        "roles": list(user.get("roles") or []),
        "permissions": effective_permissions,
        "nome": user.get("name"),
        "cargo": user.get("job_title"),
        "area": user.get("area"),
        "avatarUrl": user.get("avatar_url"),
        "ultimoLogin": user.get("last_login_at"),
        "perfilId": user.get("profile_id"),
        "perfilNome": user.get("profile_name"),
        "chaveCav4": user.get("cav4_subject"),
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
