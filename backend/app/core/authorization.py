from typing import Any, Final

from fastapi import HTTPException

OFFICIAL_ROLES: Final = {"admin", "gerente", "patrocinador", "auditor"}
LEGACY_ROLE_MAP: Final = {
    "gestor": "gerente",
    "participante": "gerente",
    "visualizador": "auditor",
}


def canonical_role(role: str | None) -> str:
    return LEGACY_ROLE_MAP.get((role or "").lower(), (role or "").lower())


def ensure_role(user: Any, *allowed_roles: str) -> Any:
    role = canonical_role(user["role"])
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
