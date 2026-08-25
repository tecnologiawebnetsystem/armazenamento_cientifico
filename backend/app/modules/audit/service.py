from .repository import ActivityLogRepository

class AuditService:
    def __init__(self, repository: ActivityLogRepository): self.repository = repository
    async def list_logs(self, limit: int = 100): return await self.repository.list(limit)
