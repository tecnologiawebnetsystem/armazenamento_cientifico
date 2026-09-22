from typing import Any

from .repository import PlatformRepository


class PlatformContextService:
    def __init__(self, repository: PlatformRepository):
        self.repository = repository

    async def context(self, user: dict[str, Any]) -> dict[str, Any]:
        return await self.repository.context(user)

    async def catalogs(self) -> dict[str, list[dict[str, Any]]]:
        return await self.repository.catalogs()

    async def dashboard(self) -> dict[str, Any]:
        return await self.repository.dashboard()


class DirectoryService:
    def __init__(self, repository: PlatformRepository):
        self.repository = repository

    async def users(self) -> list[dict[str, Any]]:
        return await self.repository.users()

    async def folders(self, project_id: str) -> dict[str, list[dict[str, Any]]]:
        return {"folders": await self.repository.folders(project_id)}


class GovernanceService:
    def __init__(self, repository: PlatformRepository):
        self.repository = repository

    async def activity_logs(self, page: int, limit: int) -> dict[str, Any]:
        logs, total = await self.repository.activity_logs(page, limit)
        return {"logs": logs, "pagination": {"page": page, "limit": limit, "total": total, "totalPages": (total + limit - 1) // limit}}

    async def access_map(self) -> dict[str, Any]:
        return await self.repository.access_map()
