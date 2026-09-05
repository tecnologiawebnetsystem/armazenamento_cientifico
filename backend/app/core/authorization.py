from collections.abc import Mapping
from typing import Any, Final

from fastapi import HTTPException

OFFICIAL_ROLES: Final = {"admin", "gerente", "patrocinador", "auditor", "solicitante"}
LEGACY_ROLE_MAP: Final = {
    "administrador": "admin",
    "administrator": "admin",
    "gestor": "gerente",
    "manager": "gerente",
    "participante": "solicitante",
    "visualizador": "auditor",
    "viewer": "auditor",
    "sponsor": "patrocinador",
    "requester": "solicitante",
}

ROLE_CAPABILITIES: Final[dict[str, frozenset[str]]] = {
    "admin": frozenset({"read", "create", "update", "delete", "manage_users", "manage_members", "approve_access", "revoke_access", "audit", "reports", "access_map", "all_projects", "all_folders"}),
    "gerente": frozenset({"read", "approve_access", "revoke_access", "access_map", "project_scope", "folder_scope"}),
    "patrocinador": frozenset({"read", "audit", "reports", "access_map", "all_projects", "all_folders"}),
    "auditor": frozenset({"read", "audit"}),
    "solicitante": frozenset({"read", "project_scope", "folder_scope"}),
} 


def has_capability(user: Any, capability: str) -> bool:
    raw_role = user.get("role") if isinstance(user, Mapping) else getattr(user, "role", None)
    return capability in ROLE_CAPABILITIES.get(canonical_role(raw_role), frozenset())


def require_capability(user: Any, capability: str) -> Any:
    if not has_capability(user, capability):
        raise HTTPException(status_code=403, detail="Usuário sem permissão para esta operação")
    return user


def role_capabilities(role: str | None) -> frozenset[str]:
    return ROLE_CAPABILITIES.get(canonical_role(role), frozenset())


def is_official_role(role: str | None) -> bool:
    return canonical_role(role) in OFFICIAL_ROLES


def can_crud(user: Any) -> bool:
    return has_capability(user, "create") or has_capability(user, "update") or has_capability(user, "delete")


def can_view_project(user: Any, project_user_ids: set[str] | None = None) -> bool:
    if has_capability(user, "all_projects"):
        return True
    user_id = str(user.get("id")) if isinstance(user, Mapping) else str(getattr(user, "id", ""))
    return user_id in (project_user_ids or set())


def can_view_folder(user: Any, allowed_user_ids: set[str] | None = None) -> bool:
    if has_capability(user, "all_folders"):
        return True
    user_id = str(user.get("id")) if isinstance(user, Mapping) else str(getattr(user, "id", ""))
    return user_id in (allowed_user_ids or set())


class AuthorizationError(HTTPException):
    def __init__(self) -> None:
        super().__init__(status_code=403, detail="Usuário sem permissão para esta operação")





def canonical_role(role: str | None) -> str:
    return LEGACY_ROLE_MAP.get((role or "").lower(), (role or "").lower())


def ensure_role(user: Any, *allowed_roles: str) -> Any:
    if isinstance(user, Mapping):
        raw_role = user.get("role")
    elif hasattr(user, "keys"):
        raw_role = user.get("role", None)
    else:
        raw_role = getattr(user, "role", None)
    role = canonical_role(raw_role)
    allowed = {canonical_role(item) for item in allowed_roles}
    if role not in allowed:
        raise HTTPException(status_code=403, detail="Usuário sem permissão para esta operação")
    return user


def require_read(user: Any) -> Any:
    return user


def require_manage(user: Any) -> Any:
    return ensure_role(user, "admin", "gerente")


def require_admin(user: Any) -> Any:
    return ensure_role(user, "admin")
