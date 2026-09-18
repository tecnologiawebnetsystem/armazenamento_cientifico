from datetime import UTC, datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class PlatformRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

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
        projects = await self.rows("select id, name as nome, code as codigo, responsible_area as \"areaResponsavel\", status, description as descricao, created_at as \"criadoEm\", updated_at as \"atualizadoEm\" from projects order by updated_at desc")
        counts = await self.one("select (select count(*) from project_members) as membros, (select count(*) from folders) as mapas, (select count(*) from access_requests where status = 'pendente') as pendencias, (select coalesce(sum(size), 0) from folders) as armazenamento")
        activity = await self.rows("select id, user_id as \"userId\", action as acao, entity as entidade, entity_id as \"entidadeId\", details as detalhes, created_at as \"criadoEm\", result as resultado, project_id as \"projetoId\" from activity_logs order by created_at desc limit 10")
        return {"projects": projects, "totalMembros": counts["membros"], "totalMapas": counts["mapas"], "armazenamentoMb": counts["armazenamento"], "pendencias": counts["pendencias"], "activity": activity, "source": "database", "consultedAt": datetime.now(UTC).isoformat()}

    async def access_requests(self) -> list[dict[str, Any]]:
        return await self.rows("select id, requester_id as \"usuarioId\", project_id as \"projetoId\", request_type as tipo, requested_role as \"papelSolicitado\", justification as justificativa, servicenow_ticket as \"numeroChamadoServiceNow\", status, created_at as \"criadoEm\", updated_at as \"atualizadoEm\", analyzed_by as \"analisadoPor\" from access_requests order by created_at desc")

    async def settings(self) -> list[dict[str, Any]]:
        return await self.rows("select key as chave, value as valor from system_settings where active = true")

    async def permission_matrix(self) -> list[dict[str, Any]]:
        return await self.rows("select role as papel, can_view_projects as \"verProjetos\", can_create_projects as \"criarProjetos\", can_edit_projects as \"editarProjeto\", can_delete_projects as \"excluirProjeto\", can_manage_members as \"gerenciarMembros\", can_upload_files as \"uploadArquivos\", can_delete_files as \"excluirArquivos\", can_approve_requests as \"aprovarSolicitacoes\" from permission_matrix order by role")

    async def activity_logs(self, page: int, limit: int) -> tuple[list[dict[str, Any]], int]:
        rows = await self.rows("select id, user_id as \"userId\", action as acao, entity as entidade, entity_id as \"entidadeId\", details as detalhes, created_at as \"criadoEm\", result as resultado, project_id as \"projetoId\" from activity_logs order by created_at desc limit :limit offset :offset", {"limit": limit, "offset": (page - 1) * limit})
        count = await self.one("select count(*) as total from activity_logs")
        return rows, int(count["total"])
