from datetime import UTC, datetime
from typing import Any, ClassVar

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

    async def context(self, session_user: dict[str, Any]) -> dict[str, Any]:
        profile_id = session_user.get("profile_id")
        user = {
            "id": session_user.get("id"),
            "email": session_user.get("email"),
            "nome": session_user.get("name") or session_user.get("email"),
            "perfil_id": profile_id,
            "perfil_nome": session_user.get("profile_name"),
        }
        if not profile_id:
            return {"user": user, "permissions": [], "modules": [], "menus": [], "dashboardCards": []}
        permissions = await self.rows(f"select pp.permission_id as id from {self.schema}.profile_permissions pp join {self.schema}.permissions p on p.id = pp.permission_id where pp.profile_id = :profile_id and pp.allowed = true and p.active = true", {"profile_id": profile_id})
        modules = await self.rows(f"select m.id, m.name as nome, m.route as rota, m.icon as icone, m.display_order as ordem from {self.schema}.profile_modules pm join {self.schema}.modules m on m.id = pm.module_id where pm.profile_id = :profile_id and pm.can_view = true and m.active = true order by m.display_order, m.name", {"profile_id": profile_id})
        menus = await self.rows(
            f"""
            select distinct
                mi.id,
                mi.name as nome,
                mi.route as rota,
                mi.icon as icone,
                mi.display_order as ordem,
                mi.parent_id
            from {self.schema}.menus mi
            left join {self.schema}.modules md
                on md.id = mi.module_id
               and md.active = true
            where mi.active = true
              and (mi.module_id is null or exists (
                  select 1
                  from {self.schema}.profile_modules pm
                  where pm.profile_id = :profile_id
                    and pm.module_id = mi.module_id
                    and pm.can_view = true
              ))
              and (mi.module_id is null or exists (
                  select 1
                  from {self.schema}.menu_permissions mp
                  join {self.schema}.profile_permissions pp
                    on pp.permission_id = mp.permission_id
                   and pp.profile_id = :profile_id
                   and pp.allowed = true
                  join {self.schema}.permissions p
                    on p.id = mp.permission_id
                   and p.module_id = mi.module_id
                   and p.active = true
                  where mp.menu_id = mi.id
                    and mp.allowed = true
              ))
            order by mi.display_order, mi.name
            """,
            {"profile_id": profile_id},
        )
        cards = await self.rows(f"select id, key, title as titulo, description as descricao, metric_key as metrica, route as rota, display_order as ordem from {self.schema}.dashboard_cards where active = true and (profile_ids = '' or position(',' || :profile_id || ',' in ',' || replace(profile_ids, ' ', '') || ',') > 0) order by display_order, title", {"profile_id": profile_id})
        return {"user": user, "permissions": [row["id"] for row in permissions], "modules": modules, "menus": menus, "dashboardCards": cards}

    async def catalogs(self) -> dict[str, list[dict[str, Any]]]:
        return {"areas": await self.rows(f"select id, name as nome, prefix as prefixo, next_number from {self.schema}.responsible_areas where active = true order by name"), "perfis": await self.rows(f"select id, name as nome, description as descricao from {self.schema}.profiles order by name"), "modulos": await self.rows(f"select id, name as nome, route as rota, icon as icone, display_order as ordem, active as ativo from {self.schema}.modules where active = true order by display_order, name"), "permissoes": await self.rows(f"select id, module_id as modulo_id, name as nome, description as descricao, active as ativo from {self.schema}.permissions where active = true order by name"), "statusProjetos": await self.rows(f"select id, code as codigo, name as nome, color as cor, display_order as ordem, active as ativo, allows_edit as permite_edicao from {self.schema}.project_statuses where active = true order by display_order"), "tiposRelatorios": await self.rows(f"select id, code as codigo, name as nome, description as descricao, formats as formatos, active as ativo from {self.schema}.report_types where active = true order by name")}

    CONFIGURATION_TABLES: ClassVar[dict[str, tuple[str, tuple[str, ...], str]]] = {
        "menus": ("menus", ("id", "module_id", "parent_id", "name", "route", "icon", "display_order", "active"), "id"),
        "modules": ("modules", ("id", "name", "route", "icon", "display_order", "active"), "id"),
        "permissions": ("permissions", ("id", "module_id", "name", "description", "active"), "id"),
        "profiles": ("profiles", ("id", "name", "description"), "id"),
        "project_statuses": ("project_statuses", ("id", "code", "name", "color", "display_order", "active", "allows_edit"), "id"),
        "responsible_areas": ("responsible_areas", ("id", "name", "prefix", "next_number", "active"), "id"),
        "report_types": ("report_types", ("id", "code", "name", "description", "formats", "active"), "id"),
        "report_fields": ("report_fields", ("id", "report_code", "field_key", "label", "source_key", "display_order", "active"), "id"),
        "dashboard_cards": ("dashboard_cards", ("id", "module_id", "key", "title", "description", "metric_key", "route", "profile_ids", "display_order", "active"), "id"),
        "menu_permissions": ("menu_permissions", ("menu_id", "permission_id", "allowed"), "menu_id"),
        "profile_permissions": ("profile_permissions", ("profile_id", "permission_id", "allowed"), "profile_id"),
        "profile_modules": ("profile_modules", ("profile_id", "module_id", "can_view"), "profile_id"),
    }

    async def configuration_rows(self, resource: str) -> list[dict[str, Any]]:
        table, columns, _ = self.CONFIGURATION_TABLES[resource]
        return await self.rows(f"select {', '.join(columns)} from {self.schema}.{table} order by 1")

    async def create_configuration(self, resource: str, data: dict[str, Any]) -> dict[str, Any]:
        table, columns, _ = self.CONFIGURATION_TABLES[resource]
        values = {key: data[key] for key in columns if key in data}
        if not values: raise ValueError("Nenhum campo informado")
        names = tuple(values)
        await self.execute(f"insert into {self.schema}.{table} ({', '.join(names)}) values ({', '.join(':' + name for name in names)})", values)
        return (await self.rows(f"select {', '.join(columns)} from {self.schema}.{table} where " + " and ".join(f"{name} = :{name}" for name in names), values))[0]

    async def update_configuration(self, resource: str, identifier: str, data: dict[str, Any]) -> dict[str, Any]:
        table, columns, key = self.CONFIGURATION_TABLES[resource]
        values = {name: data[name] for name in columns if name != key and name in data}
        if not values: raise ValueError("Nenhum campo informado")
        params = {**values, "identifier": identifier}
        await self.execute(f"update {self.schema}.{table} set {', '.join(f'{name} = :{name}' for name in values)} where {key} = :identifier", params)
        return (await self.rows(f"select {', '.join(columns)} from {self.schema}.{table} where {key} = :identifier", {"identifier": identifier}))[0]

    async def delete_configuration(self, resource: str, identifier: str) -> None:
        table, _, key = self.CONFIGURATION_TABLES[resource]
        await self.execute(f"delete from {self.schema}.{table} where {key} = :identifier", {"identifier": identifier})

    async def users(self) -> list[dict[str, Any]]:
        return await self.rows(f"select id, name as nome, email, job_title as cargo, area, avatar_url as \"avatarUrl\", last_login_at as \"ultimoLogin\", role, profile_id as \"perfilId\", created_at as \"criadoEm\" from {self.schema}.users order by name")

    async def folders(self, project_id: str) -> list[dict[str, Any]]:
        return await self.rows(f"select id, project_id as \"projectId\", parent_id as \"parentId\", kind as tipo, name as nome, size_bytes as tamanho, mime_type as \"mimeType\", created_by as \"criadoPor\", created_at as \"criadoEm\", updated_at as \"atualizadoEm\" from {self.schema}.folders where project_id = :project_id order by name", {"project_id": project_id})

    async def dashboard(self) -> dict[str, Any]:
        projects = await self.rows(f"select id, name as nome, code as codigo, responsible_area as \"areaResponsavel\", status, description as descricao, created_at as \"criadoEm\", updated_at as \"atualizadoEm\" from {self.schema}.projects order by updated_at desc")
        counts = await self.one(f"select (select count(*) from {self.schema}.project_members) as membros, (select count(*) from {self.schema}.folders) as mapas, (select coalesce(sum(size_bytes), 0) from {self.schema}.folders) as armazenamento")
        activity = await self.rows(f"select id, user_id as \"userId\", action as acao, entity as entidade, entity_id as \"entidadeId\", details as detalhes, created_at as \"criadoEm\", result as resultado, project_id as \"projetoId\" from {self.schema}.activity_logs order by created_at desc limit 10")
        return {"projects": projects, "totalMembros": counts["membros"], "totalMapas": counts["mapas"], "armazenamentoMb": counts["armazenamento"], "activity": activity, "source": "database", "consultedAt": datetime.now(UTC).isoformat()}

    async def activity_logs(self, page: int, limit: int) -> tuple[list[dict[str, Any]], int]:
        rows = await self.rows(f"select al.id, coalesce(nullif(al.user_id, ''), 'não informado') as \"userId\", coalesce(nullif(u.name, ''), nullif(s.display_name, ''), nullif(al.user_id, ''), 'não informado') as \"userName\", coalesce(nullif(u.email, ''), nullif(s.email, '')) as \"userEmail\", al.action as acao, al.entity as entidade, al.entity_id as \"entidadeId\", al.details as detalhes, al.created_at as \"criadoEm\", al.result as resultado, al.project_id as \"projetoId\" from {self.schema}.activity_logs al left join {self.schema}.users u on u.id = al.user_id left join lateral (select display_name, email from {self.schema}.sessions where user_id = al.user_id order by created_at desc limit 1) s on true order by al.created_at desc limit :limit offset :offset", {"limit": limit, "offset": (page - 1) * limit})
        count = await self.one(f"select count(*) as total from {self.schema}.activity_logs")
        return rows, int(count["total"])

    async def access_map(self) -> dict[str, Any]:
        rows = await self.rows(f'''select pm.user_id as "userId", coalesce(nullif(u.name, ''), nullif(s.display_name, ''), pm.user_id) as "userName", coalesce(nullif(u.email, ''), nullif(s.email, '')) as "userEmail", u.role as "userRole", u.area, p.id as "projectId", p.name as "projectName", p.status as "projectStatus", f.id as "resourceId", f.name as "resourceName", 'pasta' as "resourceType",  f.updated_at as "lastViewedAt" from {self.schema}.project_members pm left join {self.schema}.users u on u.id = pm.user_id left join lateral (select display_name, email from {self.schema}.sessions where user_id = pm.user_id order by created_at desc limit 1) s on true join {self.schema}.projects p on p.id = pm.project_id left join {self.schema}.folders f on f.project_id = p.id order by p.name, u.name''')
        return {"source": "database", "consultedAt": datetime.now(UTC).isoformat(), "summary": {"users": len({r["userId"] for r in rows}), "projects": len({r["projectId"] for r in rows}), "folders": len([r for r in rows if r["resourceId"]]), "files": 0, "relationships": len(rows)}, "rows": rows}
