from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4


def audit_event(*, user: Any, action: str, entity: str, entity_id: str, result: str = "sucesso", details: dict[str, Any] | None = None, project_id: str | None = None) -> dict[str, Any]:
    """Monta um evento estruturado; a persistência pode ser conectada ao repositório de auditoria."""
    user_id = user.get("id") if isinstance(user, dict) else getattr(user, "id", None)
    return {
        "id": str(uuid4()),
        "user_id": str(user_id or ""),
        "action": action,
        "entity": entity,
        "entity_id": entity_id,
        "result": result,
        "details": details or {},
        "project_id": project_id,
        "correlation_id": str(uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
