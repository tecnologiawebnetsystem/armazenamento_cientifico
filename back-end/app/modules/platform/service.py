from typing import Any

from .repository import PlatformRepository
from .use_cases import GovernanceService, PlatformContextService


class PlatformService:
    def __init__(self, repository: PlatformRepository):
        self.repository = repository
        self.context_service = PlatformContextService(repository)
        self.governance_service = GovernanceService(repository)

    async def context(self, user: dict[str, Any]) -> dict[str, Any]:
        return await self.context_service.context(user)

    async def dashboard(self) -> dict[str, Any]:
        return await self.context_service.dashboard()

    async def access_map(self) -> dict[str, Any]:
        return await self.governance_service.access_map()
