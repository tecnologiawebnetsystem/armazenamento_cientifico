import logging
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

from fastapi import HTTPException

from app.core.authorization import canonical_role
from app.core.config import settings
from app.core.temporary_sessions import get_session_user
from app.infrastructure.cav4.provider import CAV4Identity
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
        role = user.get("profile_role") or user.get("profile_name") or user.get("role")
        if not role:
            raise HTTPException(status_code=403, detail="Usuário autenticado sem perfil SIGAC configurado no banco de dados")
        if canonical_role(role) == "solicitante":
            raise HTTPException(status_code=403, detail="Seu perfil é Solicitante e não possui acesso ao SIGAC.")
        permissions = set(user.get("db_permissions") or []) if not self.temporary else set(user.get("permissions") or [])
        profile_data = user.get("profile_data") or {}
        return {
            **dict(user),
            **profile_data,
            "role": canonical_role(role),
            "roles": list(user.get("roles") or []),
            "permissions": sorted(permissions),
            "nome": user.get("display_name") or user.get("name") or user.get("user_id") or user.get("subject"),
            "cargo": user.get("job_title") or user.get("cargo"),
            "area": user.get("area"),
            "avatarUrl": user.get("avatar_url"),
            "ultimoLogin": user.get("last_login_at"),
            "perfilId": user.get("profile_id"),
            "perfilNome": user.get("profile_name") or role,
            "chaveCav4": user.get("cav4_user_id") or user.get("user_id") or user.get("subject"),
            "criadoEm": user.get("created_at"),
            "groups": list(user.get("groups") or []),
        }


def _claim(claims: dict[str, Any], *names: str) -> str | None:
    for name in names:
        value = claims.get(name)
        if value is not None and str(value).strip():
            return str(value).strip()
    return None


class Cav4SessionService:
    """Cria a sessão local a partir da identidade corporativa CAV4.

    O CAV4 identifica o usuário; o perfil, os módulos e as permissões vêm sempre
    do cadastro local do SIGAC.
    """

    def __init__(self, repository: AuthRepository) -> None:
        self.repository = repository

    async def start(self, identity: CAV4Identity) -> str:
        if not identity.email:
            raise HTTPException(status_code=401, detail="E-mail ausente na autenticação corporativa")
        roles_received = [str(role) for role in identity.roles if role]
        logger.info("cav4_roles_received email=%s roles=%s", identity.email, roles_received)

        # Captura o perfil anterior antes da resolução, para registrar a troca no log.
        previous_profile: str | None = None
        identifiers = tuple(dict.fromkeys(i for i in (identity.user_login, identity.subject, identity.email) if i))
        existing_user = await self.repository.find_user(
            identifiers, user_login=identity.user_login or "", subject=identity.subject
        )
        if existing_user is not None:
            previous_profile = existing_user.profile_id

        try:
            user = await self.repository.find_or_create_user_with_profile(
                user_login=identity.user_login or "",
                subject=identity.subject,
                email=identity.email,
                cav4_roles=roles_received,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        if not user.profile_id:
            raise HTTPException(
                status_code=403,
                detail=f"Usuário {user.user_id} autenticado, mas sem perfil configurado no SIGAC. Contate um administrador.",
            )
        if not await self.repository.profile_exists(user.profile_id):
            raise HTTPException(status_code=403, detail="Perfil do usuário não está configurado no SIGAC")

        profile_changed = previous_profile is not None and previous_profile != user.profile_id

        claims = identity.raw_claims or {}
        profile_data = {
            # O login funcional (ex.: GFZ3) é a identidade usada pela auditoria.
            "cav4_user_id": identity.user_login,
            "user_login": identity.user_login,
            "email": identity.email,
            "display_name": identity.display_name or _claim(claims, "name", "display_name", "displayName", "full_name", "fullName", "nome", "nomeCompleto"),
            "job_title": _claim(claims, "job_title", "jobTitle", "cargo", "title", "occupation"),
            "area": _claim(claims, "area", "department", "departmentName", "organizational_unit", "organizationalUnit"),
            "avatar_url": _claim(claims, "picture", "avatar", "avatar_url", "photo", "photo_url"),
        }
        session_id = str(uuid4())
        # sessions.expires_at é timestamp sem fuso: grava-se UTC sem tzinfo.
        expires_at = datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=settings.session_hours)
        await self.repository.replace_session(
            user=user, session_id=session_id, profile_data=profile_data, expires_at=expires_at
        )
        self.repository.add_authorization_log(
            user_id=user.user_id,
            session_id=session_id,
            details={
                "user_login": identity.user_login,
                "email": identity.email,
                "registered_profile": previous_profile,
                "selected_profile": user.profile_id,
                "profile_changed": profile_changed,
                "roles_received": roles_received,
                "provider": "CAV4",
            },
        )
        await self.repository.commit()
        return session_id

    async def end(self, session_id: str) -> None:
        await self.repository.delete_session(session_id)
        await self.repository.commit()
