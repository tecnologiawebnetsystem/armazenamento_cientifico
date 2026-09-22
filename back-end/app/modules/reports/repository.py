from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings


class ReportRepository:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.schema = '"' + settings.db_schema + '"'

    async def rows(self, sql: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        result = await self.session.execute(text(sql), params or {})
        return [dict(row) for row in result.mappings().all()]

    async def fields(self, report_code: str) -> list[dict[str, Any]]:
        return await self.rows(f"select id, report_code, field_key, label, source_key, display_order, active from {self.schema}.report_fields where report_code=:report_code and active=true order by display_order", {"report_code": report_code})

    async def projects(self, status: str | None, area: str | None) -> list[dict[str, Any]]:
        return await self.rows(
            f'''select p.id, p.name as nome, p.code as codigo, p.responsible_area as "areaResponsavel", p.status, p.description as descricao, p.managers_ids as "gestoresIds", p.write_group as "grupoAdEscrita", p.read_group as "grupoAdLeitura", p.write_identity_role as "roleIdentidadeEscrita", p.read_identity_role as "roleIdentidadeLeitura", p.snow_task_number as "numeroTarefaSnow", p.parent_folder as "pastaMae", p.created_at as "criadoEm", p.updated_at as "atualizadoEm", (select count(*) from {self.schema}.folders f where f.project_id = p.id) as "totalMapas", (select count(*) from {self.schema}.project_members pm where pm.project_id = p.id) as "totalMembros" from {self.schema}.projects p where (cast(:status as text) is null or p.status=:status) and (cast(:area as text) is null or p.responsible_area=:area) order by p.name''',
            {"status": status, "area": area},
        )

    async def access_map(self) -> list[dict[str, Any]]:
        return await self.rows(f'''select pm.user_id as "userId", coalesce(nullif(u.name, ''), pm.user_id) as "userName", u.email as "userEmail", u.role as "userRole", u.area, p.id as "projectId", p.name as "projectName", p.status as "projectStatus", f.id as "resourceId", f.name as "resourceName", 'pasta' as "resourceType", f.updated_at as "lastViewedAt" from {self.schema}.project_members pm left join {self.schema}.users u on u.id = pm.user_id join {self.schema}.projects p on p.id = pm.project_id left join {self.schema}.folders f on f.project_id = p.id order by p.name, u.name''')

    async def audit_logs(self) -> list[dict[str, Any]]:
        return await self.rows(f'''select al.id, al.created_at as "criadoEm", al.user_id as "userId", coalesce(u.name, al.user_id, 'não informado') as "userName", u.email as "userEmail", al.action as acao, al.entity as entidade, al.entity_id as "entidadeId", al.result as resultado, al.details as detalhes, al.project_id as "projetoId" from {self.schema}.activity_logs al left join {self.schema}.users u on u.id = al.user_id order by al.created_at desc''')

    async def by_status(self) -> list[dict[str, Any]]:
        return await self.rows(f"select status, count(*) as total from {self.schema}.projects group by status")
