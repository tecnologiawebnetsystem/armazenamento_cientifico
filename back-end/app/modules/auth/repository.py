import json
import logging
from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import case, delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.audit.models import ActivityLog
from app.modules.auth.models import UserSession
from app.modules.catalogs.models import Permission, ProfilePermission
from app.modules.users.models import Profile, User

logger = logging.getLogger(__name__)


class AuthRepository:
    def __init__(self, database: AsyncSession) -> None:
        self.database = database

    async def find_session_identity(self, session_id: str) -> dict[str, Any] | None:
        row = (
            await self.database.execute(
                select(UserSession, User, Profile)
                .outerjoin(User, User.user_id == UserSession.user_id)
                .outerjoin(Profile, Profile.id == UserSession.profile_id)
                .where(UserSession.id == session_id, UserSession.expires_at > func.now())
            )
        ).first()
        if row is None:
            return None
        session, user, profile = row
        profile_data = session.profile_data or {}
        return {
            "id": session.id,
            "user_id": session.user_id,
            "cav4_user_id": user.user_id if user else None,
            "profile_data": session.profile_data,
            "display_name": profile_data.get("display_name"),
            "email": profile_data.get("email"),
            "last_login_at": user.last_login_at if user else None,
            "created_at": user.created_at if user else None,
            "profile_id": session.profile_id,
            "profile_name": profile.name if profile else None,
            "profile_role": profile.role if profile else None,
            "db_permissions": await self._allowed_permissions(session.profile_id),
        }

    async def _allowed_permissions(self, profile_id: str | None) -> list[str]:
        if profile_id is None:
            return []
        result = await self.database.scalars(
            select(Permission.id)
            .join(ProfilePermission, ProfilePermission.permission_id == Permission.id)
            .where(
                ProfilePermission.profile_id == profile_id,
                ProfilePermission.allowed.is_(True),
                Permission.active.is_(True),
            )
            .distinct()
        )
        return list(result)

    async def find_user(self, identifiers: Sequence[str], *, user_login: str, subject: str) -> User | None:
        """Localiza o usuário local; o login explícito tem prioridade sobre o subject e o e-mail."""
        priority = case((User.user_id == user_login, 0), (User.user_id == subject, 1), else_=2)
        result = await self.database.scalars(
            select(User).where(User.user_id.in_(identifiers)).order_by(priority).limit(1)
        )
        return result.first()

    async def find_or_create_user_with_profile(
        self, *, user_login: str, subject: str, email: str, cav4_roles: Sequence[str],
    ) -> User:
        """Encontra ou provisiona o usuário resolvendo o perfil a partir dos papéis CAV4.

        - Se o usuário já existe com perfil, retorna como está.
        - Se não existe, cria com o perfil resolvido dos papéis CAV4.
        - Se existe sem perfil, atribui o perfil resolvido.
        - Se o perfil não pôde ser resolvido, o usuário fica com profile_id=None.
        """
        import hashlib
        from datetime import UTC

        identifiers = tuple(dict.fromkeys(i for i in (user_login, subject, email) if i))
        user = await self.find_user(identifiers, user_login=user_login, subject=subject)

        # Resolve perfil: primeiro profile.id que der match com algum papel CAV4.
        resolved: str | None = None
        if cav4_roles:
            resolved = await self.database.scalar(
                select(Profile.id).where(Profile.id.in_(tuple(cav4_roles))).order_by(Profile.id).limit(1)
            )

        if user is not None:
            if not user.profile_id and resolved:
                await self.database.execute(
                    update(User).where(User.id == user.id).values(profile_id=resolved)
                )
                user.profile_id = resolved
            elif user.profile_id and resolved and user.profile_id != resolved:
                logger.warning(
                    "cav4_profile_mismatch user_id=%s db_profile=%s cav4_profile=%s — atualizando para perfil CAV4",
                    user.user_id, user.profile_id, resolved,
                )
                await self.database.execute(
                    update(User).where(User.id == user.id).values(profile_id=resolved)
                )
                user.profile_id = resolved
            return user

        new_user_id = user_login or subject
        if not new_user_id:
            raise ValueError("Identidade corporativa sem login funcional")
        logger.info("cav4_auto_provisioning_user user_id=%s email=%s profile_id=%s", new_user_id, email, resolved)
        user = User(
            id=hashlib.md5(new_user_id.encode()).hexdigest(),
            user_id=new_user_id,
            profile_id=resolved,
            created_at=datetime.now(UTC),
        )
        self.database.add(user)
        await self.database.flush()
        # Commit imediato: se o serviço interromper o fluxo por falta de perfil,
        # o registro do usuário já estará persistido para futuras tentativas.
        await self.database.commit()
        return user

    async def profile_exists(self, profile_id: str) -> bool:
        return await self.database.get(Profile, profile_id) is not None

    async def replace_session(self, *, user: User, session_id: str, profile_data: dict[str, Any], expires_at: datetime) -> None:
        """Uma sessão ativa por usuário: remove as anteriores, registra o login e cria a nova."""
        await self.database.execute(delete(UserSession).where(UserSession.user_id == user.user_id))
        await self.database.execute(update(User).where(User.id == user.id).values(last_login_at=func.now()))
        self.database.add(
            UserSession(
                id=session_id,
                user_id=user.user_id,
                profile_id=user.profile_id,
                profile_data=profile_data,
                expires_at=expires_at,
            )
        )

    def add_authorization_log(self, *, user_id: str, session_id: str, details: dict[str, Any]) -> None:
        self.database.add(
            ActivityLog(
                id=str(uuid4()),
                user_id=user_id,
                action="cav4_authorization",
                entity="session",
                entity_id=session_id,
                details=json.dumps(details, ensure_ascii=False),
                result="success",
                created_at=datetime.now(UTC),
            )
        )

    async def delete_session(self, session_id: str) -> None:
        await self.database.execute(delete(UserSession).where(UserSession.id == session_id))

    async def commit(self) -> None:
        await self.database.commit()
