from datetime import UTC, datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings


class PlatformRepository:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.schema = f'"{settings.db_schema}"'

    async def rows(self, sql: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        result = await self.session.execute(text(sql), params or {})
        return [dict(row) for row in result.mappings().all()]

    async def one(self, sql: str, params: dict[str, Any] | None = None) -> dict[str, Any] | None:
        result = await self.session.execute(text(sql), params or {})
        row = result.mappings().first()
        return dict(row) if row else None

    async def execute(self, sql: str, params: dict[str, Any] | None = None) -> None:
        await self.session.execute(text(sql), params or {})
        await self.session.commit()

    async def context(self, user_id: str) -> dict[str, Any]:
        user = await self.one("select u.id, u.email, u.name as nome, u.profile_id as perfil_id, p.name as perfil_nome from users u left join profiles p on p.id = u.profile_id where u.id = :user_id", {"user_id": user_id})
        if not user or not user.get("perfil_id"):
            return {"user": user, "permissions": [], "modules": [], "menus": [], "dashboardCards": []}
        permissions = await self.rows("select pp.permission_id as id from profile_permissions pp join permissions p on p.id = pp.permission_id where pp.profile_id = :profile_id and pp.allowed = true and p.active = true", {"profile_id": user["perfil_id"]})
        modules = await self.rows("select m.id, m.name as nome, m.route as rota, m.icon as icone, m.display_order as ordem from profile_modules pm join modules m on m.id = pm.module_id where pm.profile_id = :profile_id and pm.can_view = true and m.active = true order by m.display_order, m.name", {"profile_id": user["perfil_id"]})
        menus = await self.rows("select distinct mi.id, mi.name as nome, mi.route as rota, mi.icon as icone, mi.display_order as ordem, mi.parent_id as parent_id from menus mi left join menu_permissions mp on mp.menu_id = mi.id where mi.active = true and (mp.permission_id is null or (mp.allowed = true and mp.permission_id in (select pp.permission_id from profile_permissions pp where pp.profile_id = :profile_id and pp.allowed = true))) order by mi.display_order, mi.name", {"profile_id": user["perfil_id"]})
        cards = await self.rows("select id, key, title as titulo, description as descricao, metric_key as metrica, route as rota, display_order as ordem from dashboard_cards where active = true and (profile_ids = '' or position(',' || :profile_id || ',' in ',' || replace(profile_ids, ' ', '') || ',') > 0) order by display_order, title", {"profile_id": user["perfil_id"]})
        return {"user": user, "permissions": [row["id"] for row in permissions], "modules": modules, "menus": menus, "dashboardCards": cards}

    async def catalogs(self) -> dict[str, list[dict[str, Any]]]:
        return {
            "areas": await self.rows("select id, name as nome, prefix as prefixo, next_number from responsible_areas where active = true order by name"),
            "perfis": await self.rows("select id, name as nome, description as descricao from profiles order by name"),
            "modulos": await self.rows("select id, name as nome, route as rota, icon as icone, display_order as ordem, active as ativo from modules where active = true order by display_order, name"),
            "permissoes": await self.rows("select id, module_id as modulo_id, name as nome, description as descricao, active as ativo from permissions where active = true order by name"),
            "statusProjetos": await self.rows("select id, code as codigo, name as nome, color as cor, display_order as ordem, active as ativo, allows_edit as permite_edicao from project_statuses where active = true order by display_order"),
            "tiposProjetos": await self.rows("select id, code as codigo, name as nome, description as descricao, active as ativo from project_types where active = true order by name"),
            "tiposRelatorios": await self.rows("select id, code as codigo, name as nome, description as descricao, formats as formatos, active as ativo from report_types where active = true order by name"),
        }

    async def users(self) -> list[dict[str, Any]]:
        return await self.rows("select id, name as nome, email, job_title as cargo, area, avatar_url as \"avatarUrl\", last_login_at as \"ultimoLogin\", role, profile_id as \"perfilId\", created_at as \"criadoEm\" from users order by name")

    async def folders(self, project_id: str) -> list[dict[str, Any]]:
        return await self.rows("select id, project_id as \"projectId\", parent_id as \"parentId\", 'pasta' as tipo, name as nome, size as tamanho, mime_type as \"mimeType\", created_by as \"criadoPor\", created_at as \"criadoEm\", updated_at as \"atualizadoEm\" from folders where project_id = :project_id order by name", {"project_id": project_id})

    async def dashboard(self) -> dict[str, Any]:
        projects = await self.rows(f"select id, name as nome, code as codigo, responsible_area as \"areaResponsavel\", status, description as descricao, created_at as \"criadoEm\", updated_at as \"atualizadoEm\" from {self.schema}.projects order by updated_at desc")
        counts = await self.one(f"select (select count(*) from {self.schema}.project_members) as membros, (select count(*) from {self.schema}.folders) as mapas, (select count(*) from {self.schema}.access_requests where status = 'pendente') as pendencias, (select coalesce(sum(size), 0) from {self.schema}.folders) as armazenamento")
        activity = await self.rows(f"select id, user_id as \"userId\", action as acao, entity as entidade, entity_id as \"entidadeId\", details as detalhes, created_at as \"criadoEm\", result as resultado, project_id as \"projetoId\" from {self.schema}.activity_logs order by created_at desc limit 10")
        return {"projects": projects, "totalMembros": counts["membros"], "totalMapas": counts["mapas"], "armazenamentoMb": counts["armazenamento"], "pendencias": counts["pendencias"], "activity": activity, "source": "database", "consultedAt": datetime.now(UTC).isoformat()}

    async def access_requests(self) -> list[dict[str, Any]]:
        return await self.rows("select id, requester_id as \"usuarioId\", project_id as \"projetoId\", request_type as tipo, requested_role as \"papelSolicitado\", justification as justificativa, servicenow_ticket as \"numeroChamadoServiceNow\", status, created_at as \"criadoEm\", updated_at as \"atualizadoEm\", analyzed_by as \"analisadoPor\" from access_requests order by created_at desc")

    async def settings(self) -> list[dict[str, Any]]:
        return await self.rows("select key as chave, value as valor from system_settings where active = true")

    async def activity_logs(self, page: int, limit: int) -> tuple[list[dict[str, Any]], int]:
        rows = await self.rows("select id, user_id as \"userId\", action as acao, entity as entidade, entity_id as \"entidadeId\", details as detalhes, created_at as \"criadoEm\", result as resultado, project_id as \"projetoId\" from activity_logs order by created_at desc limit :limit offset :offset", {"limit": limit, "offset": (page - 1) * limit})
        count = await self.one("select count(*) as total from activity_logs")
        return rows, int(count["total"])
