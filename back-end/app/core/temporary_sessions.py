from datetime import UTC, datetime
from typing import Any

_sessions: dict[str, dict[str, Any]] = {}


# TODO(verificar com a equipe de devs): `create_session` não tem chamador no repositório (varredura de
# 2026-10-14), então nada cria sessão temporária hoje; comentada em vez de excluída. Se voltar, restaurar
# os imports: from datetime import timedelta; from uuid import uuid4; from app.core.config import settings
# def create_session(identity: Any) -> tuple[str, datetime]:
#     session_id = str(uuid4())
#     expires_at = datetime.now(UTC) + timedelta(hours=settings.session_hours)
#     role = "solicitante"
#     _sessions[session_id] = {
#         "id": identity.subject,
#         "subject": identity.subject,
#         "email": identity.email,
#         "name": identity.display_name,
#         "role": role,
#         "roles": list(identity.roles),
#         "permissions": list(identity.permissions),
#         "groups": [],
#         "cav4_access_token": identity.access_token,
#         "created_at": datetime.now(UTC),
#         "expires_at": expires_at,
#     }
#     return session_id, expires_at


def get_session_user(session_id: str) -> dict[str, Any] | None:
    user = _sessions.get(session_id)
    if not user:
        return None
    if user["expires_at"] <= datetime.now(UTC):
        _sessions.pop(session_id, None)
        return None
    return user


def delete_session(session_id: str) -> None:
    _sessions.pop(session_id, None)
