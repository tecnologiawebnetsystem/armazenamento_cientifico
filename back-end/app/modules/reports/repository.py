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

    async def projects(self, status: str | None, area: str | None, gestor_id: str | None, user_id: str, all_projects: bool = False) -> list[dict[str, Any]]:
        scope = "" if all_projects else f" and (exists (select 1 from jsonb_array_elements_text(coalesce(p.managers_ids, '[]'::jsonb)) manager_id where manager_id=:user_id) or exists (select 1 from jsonb_array_elements_text(coalesce(p.participants_ids, '[]'::jsonb)) participant_id where participant_id=:user_id) or exists (select 1 from {self.schema}.project_members pm where pm.project_id=p.id and pm.user_id=:user_id))"
        return await self.rows(
            f'''select p.id, p.name as nome, p.code as codigo, p.responsible_area as "areaResponsavel", p.status, p.description as descricao, p.created_at as "criadoEm", p.updated_at as "atualizadoEm", coalesce((select jsonb_agg(u.user_id order by u.user_id) from {self.schema}.users u where exists (select 1 from jsonb_array_elements_text(coalesce(p.managers_ids, '[]'::jsonb)) manager_id where manager_id=cast(u.id as text))), '[]'::jsonb) as responsaveis, 0 as "totalMapas", 0 as "totalMembros" from {self.schema}.projects p where (cast(:status as text) is null or p.status=:status) and (cast(:area as text) is null or p.responsible_area=:area) and (cast(:gestor_id as text) is null or exists (select 1 from {self.schema}.users u_filter where (u_filter.id::text in (select jsonb_array_elements_text(coalesce(p.managers_ids, '[]'::jsonb))) or lower(u_filter.user_id) like lower('%' || :gestor_id || '%')) and (u_filter.id=:gestor_id or lower(u_filter.user_id) like lower('%' || :gestor_id || '%')))){scope} order by p.responsible_area, p.name''',
            {"status": status, "area": area, "gestor_id": gestor_id, "user_id": user_id},
        )

    async def by_status(self) -> list[dict[str, Any]]:
        return await self.rows(f"select status, count(*) as total from {self.schema}.projects group by status")

    async def inconsistencies(self, area: str | None, gestor_id: str | None, tipo: str | None, user_id: str, all_projects: bool = False) -> list[dict[str, Any]]:
        scope = "" if all_projects else f" and (exists (select 1 from jsonb_array_elements_text(coalesce(p.managers_ids, '[]'::jsonb)) manager_id where manager_id=:user_id) or exists (select 1 from {self.schema}.project_members pm where pm.project_id=p.id and pm.user_id=:user_id))"
        return await self.rows(f'''select coalesce(ra.id, 'sem-area') as "areaId", coalesce(ra.name, p.responsible_area, 'Área não cadastrada') as area, p.id as "projetoId", p.name as projeto, p.code as codigo, p.status, coalesce(nullif(p.write_group, ''), nullif(p.read_group, '')) as grupo, case when p.id is null then 'area-sem-projeto' when nullif(p.write_group, '') is null and nullif(p.read_group, '') is null then 'projeto-sem-grupo' when nullif(p.write_group, '') is null or nullif(p.read_group, '') is null then 'grupo-incompleto' end as tipo, case when p.id is null then 'Área cadastrada sem projeto vinculado.' when nullif(p.write_group, '') is null and nullif(p.read_group, '') is null then 'Projeto sem grupo de leitura e escrita mapeado.' else 'Projeto com apenas um dos grupos mapeado.' end as descricao from {self.schema}.responsible_areas ra full join {self.schema}.projects p on p.responsible_area=ra.id where (cast(:area as text) is null or ra.id=:area or p.responsible_area=:area) and (cast(:gestor_id as text) is null or exists (select 1 from jsonb_array_elements_text(coalesce(p.managers_ids, '[]'::jsonb)) manager_id where manager_id=:gestor_id)) and (cast(:tipo as text) is null or case when p.id is null then 'area-sem-projeto' when nullif(p.write_group, '') is null and nullif(p.read_group, '') is null then 'projeto-sem-grupo' when nullif(p.write_group, '') is null or nullif(p.read_group, '') is null then 'grupo-incompleto' end=:tipo){scope} and (p.id is null or nullif(p.write_group, '') is null or nullif(p.read_group, '') is null) order by area, projeto''', {"area": area, "gestor_id": gestor_id, "tipo": tipo, "user_id": user_id})
