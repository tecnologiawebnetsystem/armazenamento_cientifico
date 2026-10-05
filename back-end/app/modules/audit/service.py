from .repository import ActivityLogRepository


class AuditService:
    def __init__(self, repository: ActivityLogRepository):
        self.repository = repository

    async def record_event(self, *, user_id: str, action: str, entity: str, entity_id: str | None, details: dict[str, object], result: str):
        return await self.repository.create(
            user_id=user_id,
            action=action,
            entity=entity,
            entity_id=entity_id,
            details=details,
            result=result,
        )

    async def list_logs(self, limit: int = 100):
        return await self.repository.list(limit)
