from typing import Any

from .repository import ReportRepository


class ReportService:
    def __init__(self, repository: ReportRepository):
        self.repository = repository

    async def fields(self, report_code: str) -> dict[str, Any]:
        return {"reportCode": report_code, "fields": await self.repository.fields(report_code)}

    async def projects(self, status: str | None, area: str | None, gestor_id: str | None, user: dict[str, Any]) -> dict[str, Any]:
        rows = await self.repository.projects(status, area, gestor_id, user_id=str(user.get("id") or ""), all_projects="all_projects" in (user.get("capabilities") or []))
        by_area: dict[str, int] = {}
        for row in rows:
            by_area[row.get("areaResponsavel") or "Não informada"] = by_area.get(row.get("areaResponsavel") or "Não informada", 0) + 1
        return {"filtros": {"status": status or "todos", "area": area, "gestorId": gestor_id}, "indicadores": {"totalProjetos": len(rows), "ativos": sum(row.get("status") in ("ativo", "em_andamento") for row in rows), "suspensos": sum(row.get("status") == "suspenso" for row in rows), "concluidos": sum(row.get("status") == "concluido" for row in rows), "armazenamentoUsadoMb": 0, "totalMembros": 0, "totalMapas": 0}, "porArea": [{"area": key, "total": value} for key, value in sorted(by_area.items())], "porStatus": await self.repository.by_status(), "projetos": rows}

    async def inconsistencies(self, area: str | None, gestor_id: str | None, tipo: str | None, user: dict[str, Any]) -> dict[str, Any]:
        rows = await self.repository.inconsistencies(area, gestor_id, tipo, str(user.get("id") or ""), "all_projects" in (user.get("capabilities") or []))
        return {"total": len(rows), "inconsistencias": rows}
