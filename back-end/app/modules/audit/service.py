from .repository import ActivityLogRepository


class AuditService:
    def __init__(self, repository: ActivityLogRepository):
        self.repository = repository

    async def record_event(self, *, user_id: str, action: str, entity: str, entity_id: str | None, details: dict[str, object], result: str, correlation_id: str | None = None, http_method: str | None = None, route: str | None = None, duration_ms: float | None = None, ip_address: str | None = None):
        return await self.repository.create(user_id=user_id, action=action, entity=entity, entity_id=entity_id, details=details, result=result, correlation_id=correlation_id, http_method=http_method, route=route, duration_ms=duration_ms, ip_address=ip_address)

    async def list_logs(self, limit: int = 100):
        return await self.repository.list(limit)
