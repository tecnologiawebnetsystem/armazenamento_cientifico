from __future__ import annotations

from datetime import UTC, datetime
from functools import wraps
from typing import Any, Awaitable, Callable
from uuid import uuid4

AUDIT_ACTIONS = frozenset({"login", "logout", "visualizacao", "criacao", "alteracao", "exclusao", "consulta", "exportacao", "download", "permissao_negada", "erro"})
SENSITIVE_KEYS = {"password", "senha", "token", "secret", "authorization", "cookie", "access_token", "refresh_token"}


def mask_sensitive(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: "[REDACTED]" if key.lower() in SENSITIVE_KEYS or any(secret in key.lower() for secret in SENSITIVE_KEYS) else mask_sensitive(item) for key, item in value.items()}
    if isinstance(value, list):
        return [mask_sensitive(item) for item in value]
    return value


def audit_event(*, user: Any, action: str, entity: str, entity_id: str | None = None, result: str = "sucesso", details: dict[str, Any] | None = None, project_id: str | None = None, correlation_id: str | None = None) -> dict[str, Any]:
    """Cria um evento normalizado e seguro para persistência ou testes."""
    user_id = user.get("user_id") or user.get("id") if isinstance(user, dict) else getattr(user, "user_id", None) or getattr(user, "id", None)
    return {"id": str(uuid4()), "user_id": str(user_id or ""), "action": action if action in AUDIT_ACTIONS else "erro", "entity": entity, "entity_id": entity_id, "result": result, "details": mask_sensitive(details or {}), "project_id": project_id, "correlation_id": correlation_id, "created_at": datetime.now(UTC).isoformat()}


def auditar(*, action: str, entity: str, entity_id: str | None = None, level: str = "essencial"):
    """Decorador para ações de domínio importantes; a rota pode persistir o evento."""
    def decorator(function: Callable[..., Awaitable[Any]]):
        @wraps(function)
        async def wrapped(*args: Any, **kwargs: Any):
            request = next((item for item in (*args, *kwargs.values()) if hasattr(item, "state") and hasattr(item, "headers")), None)
            if request is not None:
                request.state.audit_action = action
                request.state.audit_entity = entity
                request.state.audit_entity_id = entity_id
                request.state.audit_level = level
            return await function(*args, **kwargs)
        return wrapped
    return decorator
