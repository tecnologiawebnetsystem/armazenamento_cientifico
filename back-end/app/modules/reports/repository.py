from typing import Any

from sqlalchemy import exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalogs.models import ReportField, ResponsibleArea
from app.modules.projects.models import Project, ProjectMember


class ReportRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def fields(self, report_code: str) -> list[dict[str, Any]]:
        result = await self.session.execute(
            select(
                ReportField.id, ReportField.report_code, ReportField.field_key, ReportField.label,
                ReportField.source_key, ReportField.display_order, ReportField.active,
            )
            .where(ReportField.report_code == report_code, ReportField.active.is_(True))
            .order_by(ReportField.display_order, ReportField.id)
        )
        return [dict(row) for row in result.mappings().all()]

    async def projects(self, status: str | None, area: str | None, gestor_id: str | None, user_id: str, all_projects: bool = False) -> list[dict[str, Any]]:
        statement = select(
            Project.id, Project.name.label("nome"), Project.code.label("codigo"),
            Project.responsible_area.label("areaResponsavel"), Project.managers_ids.label("responsaveis"),
            Project.parent_folder.label("pastaMae"), Project.status, Project.description.label("descricao"),
            Project.created_at.label("criadoEm"), Project.updated_at.label("atualizadoEm"),
        )
        if status is not None:
            statement = statement.where(Project.status == status)
        if area is not None:
            statement = statement.where(Project.responsible_area == area)
        if gestor_id is not None:
            statement = statement.where(
                Project.managers_ids.contains([gestor_id])
            )
        if not all_projects:
            statement = statement.where(or_(
                Project.managers_ids.contains([user_id]),
                Project.participants_ids.contains([user_id]),
                exists().where(ProjectMember.project_id == Project.id, ProjectMember.user_id == user_id),
            ))
        result = await self.session.execute(statement.order_by(Project.name, Project.id))
        return [{**row, "totalMapas": 0, "totalMembros": 0} for row in result.mappings().all()]

    async def by_status(self) -> list[dict[str, Any]]:
        result = await self.session.execute(select(Project.status, func.count().label("total")).group_by(Project.status))
        return [dict(row) for row in result.mappings().all()]

    async def inconsistencies(self, area: str | None, gestor_id: str | None, tipo: str | None, user_id: str, all_projects: bool = False) -> list[dict[str, Any]]:
        """Relatório de inconsistências: projetos sem grupos de acesso mapeados."""
        stmt = (
            select(
                ResponsibleArea.id.label("areaId"),
                func.coalesce(ResponsibleArea.name, Project.responsible_area).label("area"),
                Project.id.label("projetoId"),
                Project.name.label("projeto"),
                Project.code.label("codigo"),
                Project.status,
                func.coalesce(
                    func.nullif(Project.write_group, ""),
                    func.nullif(Project.read_group, ""),
                ).label("grupo"),
            )
            .select_from(Project.__table__.outerjoin(
                ResponsibleArea, Project.responsible_area == ResponsibleArea.id
            ))
            .where(
                or_(
                    func.nullif(Project.write_group, "").is_(None),
                    func.nullif(Project.read_group, "").is_(None),
                )
            )
        )
        if area is not None:
            stmt = stmt.where(or_(ResponsibleArea.id == area, Project.responsible_area == area))
        if gestor_id is not None:
            stmt = stmt.where(Project.managers_ids.contains([gestor_id]))
        if not all_projects:
            stmt = stmt.where(or_(
                Project.managers_ids.contains([user_id]),
                exists().where(ProjectMember.project_id == Project.id, ProjectMember.user_id == user_id),
            ))
        result = await self.session.execute(stmt.order_by("area", "projeto"))
        rows = []
        for row in result.mappings().all():
            r = dict(row)
            if r["projetoId"] is None:
                r["tipo"] = "area-sem-projeto"
                r["descricao"] = "Área cadastrada sem projeto vinculado."
            elif not r["grupo"]:
                r["tipo"] = "projeto-sem-grupo"
                r["descricao"] = "Projeto sem grupo de leitura e escrita mapeado."
            else:
                r["tipo"] = "grupo-incompleto"
                r["descricao"] = "Projeto com apenas um dos grupos mapeado."
            if tipo is None or r["tipo"] == tipo:
                rows.append(r)
        return rows
