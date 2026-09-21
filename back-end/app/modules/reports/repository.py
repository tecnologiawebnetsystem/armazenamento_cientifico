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
            f'''select p.id, p.name as nome, p.code as codigo, p.responsible_area as "areaResponsavel", p.status, p.description as descricao, p.created_at as "criadoEm", p.updated_at as "atualizadoEm", 0 as "totalMapas", 0 as "totalMembros" from {self.schema}.projects p where (cast(:status as text) is null or p.status=:status) and (cast(:area as text) is null or p.responsible_area=:area) order by p.name''',
            {"status": status, "area": area},
        )

    async def by_status(self) -> list[dict[str, Any]]:
        return await self.rows(f"select status, count(*) as total from {self.schema}.projects group by status")
