from typing import Any

from .repository import PlatformRepository


class PlatformContextService:
    def __init__(self, repository: PlatformRepository):
        self.repository = repository

    async def context(self, user: dict[str, Any]) -> dict[str, Any]:
        return await self.repository.context(user)

    async def dashboard(self) -> dict[str, Any]:
        return await self.repository.dashboard()


class GovernanceService:
    def __init__(self, repository: PlatformRepository):
        self.repository = repository

    async def access_map(self) -> dict[str, Any]:
        return await self.repository.access_map()
