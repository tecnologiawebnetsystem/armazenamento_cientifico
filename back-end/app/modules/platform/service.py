from datetime import datetime
from typing import Any
from uuid import uuid4

from .repository import PlatformRepository


class PlatformService:
    def __init__(self, repository: PlatformRepository):
        self.repository = repository

    async def catalogs(self) -> dict[str, list[dict[str, Any]]]:
        return await self.repository.catalogs()

    async def users(self) -> list[dict[str, Any]]:
        return await self.repository.users()

    async def dashboard(self) -> dict[str, Any]:
        return await self.repository.dashboard()

    async def folders(self, project_id: str) -> dict[str, list[dict[str, Any]]]:
        return {"folders": await self.repository.folders(project_id)}

    async def access_requests(self) -> dict[str, list[dict[str, Any]]]:
        return {"requests": await self.repository.access_requests()}

    async def settings(self) -> dict[str, Any]:
        values = await self.repository.settings()
        return {"settings": {row["chave"]: row["valor"] for row in values}}

    async def permission_matrix(self) -> dict[str, list[dict[str, Any]]]:
        return {"matrix": await self.repository.permission_matrix()}

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
        rows = await self.repository.rows("""select u.id as \"userId\", u.name as \"userName\", u.email as \"userEmail\", u.role as \"userRole\", u.area, p.id as \"projectId\", p.name as \"projectName\", p.status as \"projectStatus\", f.id as \"resourceId\", f.name as \"resourceName\", 'pasta' as \"resourceType\", pm.role as \"accessLevel\", f.updated_at as \"lastViewedAt\" from project_members pm join users u on u.id = pm.user_id join projects p on p.id = pm.project_id left join folders f on f.project_id = p.id order by p.name, u.name""")
        return {"source": "database", "consultedAt": datetime.utcnow().isoformat(), "summary": {"users": len({r["userId"] for r in rows}), "projects": len({r["projectId"] for r in rows}), "folders": len([r for r in rows if r["resourceId"]]), "files": 0, "relationships": len(rows)}, "rows": rows}
