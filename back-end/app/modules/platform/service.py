from typing import Any

from .repository import PlatformRepository
from .use_cases import DirectoryService, GovernanceService, PlatformContextService


class PlatformService:
    def __init__(self, repository: PlatformRepository):
        self.repository = repository
        self.context_service = PlatformContextService(repository)
        self.directory_service = DirectoryService(repository)
        self.governance_service = GovernanceService(repository)

    async def context(self, user: dict[str, Any]) -> dict[str, Any]:
        return await self.context_service.context(user)

    async def catalogs(self) -> dict[str, list[dict[str, Any]]]:
        return await self.context_service.catalogs()

    async def users(self) -> list[dict[str, Any]]:
        return await self.directory_service.users()

    async def dashboard(self) -> dict[str, Any]:
        return await self.context_service.dashboard()

    async def folders(self, project_id: str) -> dict[str, list[dict[str, Any]]]:
        return await self.directory_service.folders(project_id)

    async def activity_logs(self, page: int, limit: int) -> dict[str, Any]:
        logs, total = await self.repository.activity_logs(page, limit)
        return {"logs": logs, "pagination": {"page": page, "limit": limit, "total": total, "totalPages": (total + limit - 1) // limit}}

    async def access_map(self) -> dict[str, Any]:
        return await self.governance_service.access_map()
