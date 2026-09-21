from typing import Any
from .repository import ReportRepository


class ReportService:
    def __init__(self, repository: ReportRepository):
        self.repository = repository

    async def fields(self, report_code: str) -> dict[str, Any]:
        return {"reportCode": report_code, "fields": await self.repository.fields(report_code)}

    async def projects(self, status: str | None, area: str | None, gestor_id: str | None) -> dict[str, Any]:
        rows = await self.repository.projects(status, area)
        return {"filtros": {"status": status or "todos", "area": area, "gestorId": gestor_id}, "indicadores": {"totalProjetos": len(rows), "ativos": sum(row.get("status") in ("ativo", "em_andamento") for row in rows), "suspensos": sum(row.get("status") == "suspenso" for row in rows), "concluidos": sum(row.get("status") == "concluido" for row in rows), "armazenamentoUsadoMb": 0, "totalMembros": 0, "totalMapas": 0}, "porArea": [], "porStatus": await self.repository.by_status(), "projetos": rows}
