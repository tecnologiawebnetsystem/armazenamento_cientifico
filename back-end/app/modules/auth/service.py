import logging
from typing import Any

from fastapi import HTTPException

from app.core.authorization import canonical_role
from app.core.temporary_sessions import get_session_user
from app.modules.auth.repository import AuthRepository

logger = logging.getLogger(__name__)


class CurrentUserService:
    def __init__(self, repository: AuthRepository | None = None, temporary: bool = False) -> None:
        self.repository = repository
        self.temporary = temporary

    async def get(self, session_id: str) -> dict[str, Any]:
        user = get_session_user(session_id) if self.temporary else await self.repository.find_session_identity(session_id)  # type: ignore[union-attr]
        if not user:
            raise HTTPException(status_code=401, detail="Sessão inválida ou expirada")
        role = user.get("profile_name") or user.get("role")
        if not role:
            raise HTTPException(status_code=403, detail="Usuário autenticado sem perfil SIGAC configurado no banco de dados")
        permissions = set(user.get("db_permissions") or []) if not self.temporary else set(user.get("permissions") or [])
        return {
            **dict(user),
            "role": canonical_role(role),
            "roles": list(user.get("roles") or []),
            "permissions": sorted(permissions),
            "nome": user.get("name") or user.get("display_name"),
            "cargo": user.get("job_title") or user.get("cargo"),
            "area": user.get("area"),
            "avatarUrl": user.get("avatar_url"),
            "ultimoLogin": user.get("last_login_at"),
            "perfilId": user.get("profile_id"),
            "perfilNome": user.get("profile_name") or role,
            "chaveCav4": user.get("cav4_subject") or user.get("subject"),
            "criadoEm": user.get("created_at"),
            "groups": list(user.get("groups") or []),
        }
