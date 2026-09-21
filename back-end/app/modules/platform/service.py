from typing import Any
from uuid import uuid4

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

    async def access_requests(self) -> dict[str, list[dict[str, Any]]]:
        return await self.governance_service.access_requests()

    async def settings(self) -> dict[str, Any]:
        return await self.governance_service.settings()

    async def activity_logs(self, page: int, limit: int) -> dict[str, Any]:
        logs, total = await self.repository.activity_logs(page, limit)
        return {"logs": logs, "pagination": {"page": page, "limit": limit, "total": total, "totalPages": (total + limit - 1) // limit}}

    async def create_access_request(self, user_id: str, data: dict[str, Any]) -> dict[str, Any]:
        request_id = str(uuid4())
        await self.repository.execute("insert into access_requests (id, requester_id, project_id, request_type, requested_role, justification, status, created_at, updated_at) values (:id, :user_id, :project_id, :request_type, :role, :justification, 'pendente', now(), now())", {"id": request_id, "user_id": user_id, "project_id": data["projetoId"], "request_type": data["tipo"], "role": data["papelSolicitado"], "justification": data["justificativa"]})
        return {"request": {"id": request_id, **data, "status": "pendente"}}

    async def update_access_request(self, request_id: str, status: str, user_id: str) -> dict[str, Any]:
        await self.repository.execute("update access_requests set status = :status, analyzed_by = :user_id, updated_at = now() where id = :id", {"id": request_id, "status": status, "user_id": user_id})
        request = await self.repository.one("select id, requester_id as \"usuarioId\", project_id as \"projetoId\", request_type as tipo, requested_role as \"papelSolicitado\", justification as justificativa, status from access_requests where id = :id", {"id": request_id})
        return {"request": request}

    async def update_settings(self, values: dict[str, Any]) -> dict[str, Any]:
        for key, value in values.items():
            await self.repository.execute("update system_settings set value = :value where key = :key", {"key": key, "value": str(value)})
        return await self.settings()

    async def access_map(self) -> dict[str, Any]:
        return await self.governance_service.access_map()
