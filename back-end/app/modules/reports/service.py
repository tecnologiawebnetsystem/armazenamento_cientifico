from typing import Any

from app.core.authorization import has_capability

from .repository import ReportRepository


class ReportService:
    def __init__(self, repository: ReportRepository):
        self.repository = repository

    async def fields(self, report_code: str) -> dict[str, Any]:
        return {"reportCode": report_code, "fields": await self.repository.fields(report_code)}

    async def projects(self, status: str | None, area: str | None, gestor_id: str | None, user: dict[str, Any]) -> dict[str, Any]:
        all_projects = has_capability(user, "all_projects")
        rows = await self.repository.projects(status, area, gestor_id, user_id=str(user.get("user_id") or user.get("id") or ""), all_projects=all_projects)
        by_area: dict[str, int] = {}
        for row in rows:
            by_area[row.get("areaResponsavel") or "Não informada"] = by_area.get(row.get("areaResponsavel") or "Não informada", 0) + 1
        return {"filtros": {"status": status or "todos", "area": area, "gestorId": gestor_id}, "indicadores": {"totalProjetos": len(rows), "ativos": sum(row.get("status") in ("ativo", "em_andamento") for row in rows), "suspensos": sum(row.get("status") == "suspenso" for row in rows), "concluidos": sum(row.get("status") == "concluido" for row in rows), "armazenamentoUsadoMb": 0, "totalMembros": sum(row.get("totalMembros", 0) for row in rows), "totalMapas": sum(row.get("totalMapas", 0) for row in rows)}, "porArea": [{"area": key, "total": value} for key, value in sorted(by_area.items())], "porStatus": await self.repository.by_status(), "projetos": rows}

    async def group_assignments(
        self,
        search: str | None,
        area: str | None,
        principal_type: str | None,
        access_level: str | None,
        user: dict[str, Any],
    ) -> dict[str, Any]:
        rows = await self.repository.group_assignments(
            search,
            area,
            principal_type,
            access_level,
            str(user.get("user_id") or user.get("id") or ""),
            all_projects=has_capability(user, "all_projects"),
        )
        return {"total": len(rows), "grupos": rows}

    async def members(
        self, search: str | None, area: str | None, user: dict[str, Any]
    ) -> dict[str, Any]:
        rows = await self.repository.members(
            search,
            area,
            str(user.get("user_id") or user.get("id") or ""),
            all_projects=has_capability(user, "all_projects"),
        )
        members: dict[str, dict[str, Any]] = {}
        for row in rows:
            login = str(row.get("usuario") or "").strip()
            if not login:
                continue
            key = login.casefold()
            member = members.setdefault(key, {
                "id": login,
                "usuario": login,
                "nome": row.get("nome") or login,
                "email": row.get("email") or "",
                "perfil": row.get("perfil"),
                "vinculos": [],
            })
            if not member.get("email") and row.get("email"):
                member["email"] = row["email"]
            if not member.get("perfil") and row.get("perfil"):
                member["perfil"] = row["perfil"]
            link = {
                "projetoId": row.get("projetoId"),
                "projeto": row.get("projeto"),
                "codigo": row.get("codigo"),
                "area": row.get("area"),
                "grupo": row.get("grupo"),
                "papel": row.get("papel"),
                "nivel": row.get("nivel"),
                "adicionadoEm": row.get("adicionadoEm"),
            }
            link_key = (link["projetoId"], link["grupo"], link["papel"])
            if not any(
                (item["projetoId"], item["grupo"], item["papel"]) == link_key
                for item in member["vinculos"]
            ):
                member["vinculos"].append(link)
        result = sorted(
            members.values(),
            key=lambda item: (item["nome"].casefold(), item["usuario"].casefold()),
        )
        for member in result:
            member["vinculos"].sort(
                key=lambda item: ((item.get("area") or "").casefold(), (item.get("grupo") or "").casefold(), (item.get("projeto") or "").casefold())
            )
        return {"total": len(result), "membros": result}

    async def inconsistencies(self, area: str | None, gestor_id: str | None, tipo: str | None, user: dict[str, Any]) -> dict[str, Any]:
        all_projects = has_capability(user, "all_projects")
        rows = await self.repository.inconsistencies(area, gestor_id, tipo, str(user.get("user_id") or user.get("id") or ""), all_projects)
        return {"total": len(rows), "inconsistencias": rows}
