from typing import Any

from sqlalchemy import String, exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalogs.models import ReportField, ResponsibleArea
from app.modules.folders.models import Folder
from app.modules.projects.models import (
    Project,
    ProjectAccessGroup,
    ProjectFolderAccessMember,
    ProjectFolderAccessSnapshot,
    ProjectGroup,
    ProjectMember,
)
from app.modules.users.models import Profile, User


class ReportRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    # ── helpers ──────────────────────────────────────────────────────

    @staticmethod
    def _jsonb_like(column, value: str):
        """Busca um valor dentro de uma coluna JSONB usando LIKE textual.

        Evita o operador @> (contains) que exige valor JSON válido e falha
        quando o parâmetro é uma string hex (ex: users.id).
        """
        return column.cast(String).like(f"%{value}%")

    # ── fields ───────────────────────────────────────────────────────

    async def fields(self, report_code: str) -> list[dict[str, Any]]:
        result = await self.session.execute(
            select(
                ReportField.id,
                ReportField.report_code,
                ReportField.field_key,
                ReportField.label,
                ReportField.source_key,
                ReportField.display_order,
                ReportField.active,
            )
            .where(ReportField.report_code == report_code, ReportField.active.is_(True))
            .order_by(ReportField.display_order, ReportField.id)
        )
        return [dict(row) for row in result.mappings().all()]

    async def projects(
        self,
        status: str | None,
        area: str | None,
        gestor_id: str | None,
        user_id: str,
        all_projects: bool = False,
    ) -> list[dict[str, Any]]:
        statement = select(
            Project.id,
            Project.name.label("nome"),
            Project.code.label("codigo"),
            Project.responsible_area.label("areaResponsavel"),
            Project.managers_ids.label("responsaveis"),
            Project.parent_folder.label("pastaMae"),
            Project.status,
            Project.description.label("descricao"),
            Project.created_at.label("criadoEm"),
            Project.updated_at.label("atualizadoEm"),
            select(func.count(Folder.id))
            .where(Folder.project_id == Project.id, Folder.kind == "pasta")
            .scalar_subquery()
            .label("totalMapas"),
            select(func.count(ProjectMember.user_id))
            .where(ProjectMember.project_id == Project.id)
            .scalar_subquery()
            .label("totalMembros"),
        )
        if status is not None:
            statement = statement.where(Project.status == status)
        if area is not None:
            statement = statement.where(Project.responsible_area == area)
        if gestor_id is not None:
            statement = statement.where(self._jsonb_like(Project.managers_ids, gestor_id))
        if not all_projects:
            statement = statement.where(
                or_(
                    self._jsonb_like(Project.managers_ids, user_id),
                    self._jsonb_like(Project.participants_ids, user_id),
                    exists().where(
                        ProjectMember.project_id == Project.id, ProjectMember.user_id == user_id
                    ),
                )
            )
        result = await self.session.execute(statement.order_by(Project.name, Project.id))
        return [dict(row) for row in result.mappings().all()]

    async def group_assignments(
        self,
        search: str | None,
        area: str | None,
        principal_type: str | None,
        access_level: str | None,
        user_id: str,
        all_projects: bool = False,
    ) -> list[dict[str, Any]]:
        statement = (
            select(
                ProjectGroup.group_id.label("id"),
                ProjectGroup.group_name.label("grupo"),
                ProjectGroup.identifier.label("identificador"),
                ProjectGroup.principal_type.label("tipo"),
                ProjectGroup.access_level.label("nivel"),
                Project.id.label("projetoId"),
                Project.name.label("projeto"),
                Project.code.label("codigo"),
                func.coalesce(ResponsibleArea.name, Project.responsible_area).label("area"),
            )
            .select_from(ProjectGroup)
            .join(
                ProjectAccessGroup,
                (ProjectAccessGroup.project_id == ProjectGroup.project_id)
                & (ProjectAccessGroup.group_id == ProjectGroup.group_id),
            )
            .join(Project, Project.id == ProjectAccessGroup.project_id)
            .outerjoin(ResponsibleArea, Project.responsible_area == ResponsibleArea.id)
        )
        if principal_type is not None:
            statement = statement.where(ProjectGroup.principal_type == principal_type)
        if access_level is not None:
            statement = statement.where(ProjectGroup.access_level == access_level)
        if area is not None:
            statement = statement.where(
                or_(ResponsibleArea.id == area, Project.responsible_area == area)
            )
        if search:
            pattern = f"%{search.strip()}%"
            statement = statement.where(
                or_(
                    ProjectGroup.group_name.ilike(pattern),
                    ProjectGroup.identifier.ilike(pattern),
                    Project.name.ilike(pattern),
                    Project.code.ilike(pattern),
                    Project.responsible_area.ilike(pattern),
                    ResponsibleArea.name.ilike(pattern),
                )
            )
        if not all_projects:
            statement = statement.where(
                or_(
                    self._jsonb_like(Project.managers_ids, user_id),
                    self._jsonb_like(Project.participants_ids, user_id),
                    exists().where(
                        ProjectMember.project_id == Project.id,
                        ProjectMember.user_id == user_id,
                    ),
                )
            )
        result = await self.session.execute(
            statement.order_by(ProjectGroup.group_name, Project.name, Project.code)
        )
        return [dict(row) for row in result.mappings().all()]

    async def members(
        self,
        search: str | None,
        area: str | None,
        user_id: str,
        all_projects: bool = False,
    ) -> list[dict[str, Any]]:
        from app.modules.projects.folder_access import folder_access_entry_key

        directory_statement = (
            select(
                ProjectFolderAccessMember.login.label("usuario"),
                ProjectFolderAccessMember.name.label("nome"),
                ProjectFolderAccessMember.email.label("email"),
                Profile.name.label("perfil"),
                ProjectFolderAccessMember.entry_key.label("entryKey"),
                ProjectFolderAccessSnapshot.payload.label("snapshot"),
                ProjectFolderAccessSnapshot.synced_at.label("adicionadoEm"),
                Project.id.label("projetoId"),
                Project.name.label("projeto"),
                Project.code.label("codigo"),
                func.coalesce(ResponsibleArea.name, Project.responsible_area).label("area"),
            )
            .select_from(ProjectFolderAccessMember)
            .join(Project, Project.id == ProjectFolderAccessMember.project_id)
            .join(
                ProjectFolderAccessSnapshot,
                ProjectFolderAccessSnapshot.project_id == Project.id,
            )
            .outerjoin(User, func.lower(User.user_id) == func.lower(ProjectFolderAccessMember.login))
            .outerjoin(Profile, Profile.id == User.profile_id)
            .outerjoin(ResponsibleArea, Project.responsible_area == ResponsibleArea.id)
        )
        direct_statement = (
            select(
                User.user_id.label("usuario"),
                User.user_id.label("nome"),
                func.cast("", String).label("email"),
                Profile.name.label("perfil"),
                ProjectMember.role.label("papel"),
                ProjectMember.created_at.label("adicionadoEm"),
                Project.id.label("projetoId"),
                Project.name.label("projeto"),
                Project.code.label("codigo"),
                func.coalesce(ResponsibleArea.name, Project.responsible_area).label("area"),
            )
            .select_from(ProjectMember)
            .join(Project, Project.id == ProjectMember.project_id)
            .join(User, User.id == ProjectMember.user_id)
            .outerjoin(Profile, Profile.id == User.profile_id)
            .outerjoin(ResponsibleArea, Project.responsible_area == ResponsibleArea.id)
        )

        if area is not None:
            area_filter = or_(
                ResponsibleArea.id == area, Project.responsible_area == area
            )
            directory_statement = directory_statement.where(area_filter)
            direct_statement = direct_statement.where(area_filter)
        if search:
            pattern = f"%{search.strip()}%"
            directory_statement = directory_statement.where(
                or_(
                    ProjectFolderAccessMember.login.ilike(pattern),
                    ProjectFolderAccessMember.name.ilike(pattern),
                    ProjectFolderAccessMember.email.ilike(pattern),
                    Profile.name.ilike(pattern),
                )
            )
            direct_statement = direct_statement.where(
                or_(User.user_id.ilike(pattern), Profile.name.ilike(pattern))
            )
        if not all_projects:
            project_scope = or_(
                self._jsonb_like(Project.managers_ids, user_id),
                self._jsonb_like(Project.participants_ids, user_id),
                exists(
                    select(ProjectMember.project_id)
                    .where(
                        ProjectMember.project_id == Project.id,
                        ProjectMember.user_id == user_id,
                    )
                    .correlate(Project)
                ),
            )
            directory_statement = directory_statement.where(project_scope)
            direct_statement = direct_statement.where(project_scope)

        directory_result = await self.session.execute(directory_statement)
        rows: list[dict[str, Any]] = []
        for row in directory_result.mappings().all():
            data = dict(row)
            entry_key = data.pop("entryKey", None)
            matching_entry = next(
                (
                    entry
                    for entry in (data.pop("snapshot") or {}).get("entries", [])
                    if folder_access_entry_key(entry) == entry_key
                ),
                {},
            )
            rows.append({
                **data,
                "papel": matching_entry.get("nivelSigac"),
                "grupo": matching_entry.get("grupo"),
                "nivel": matching_entry.get("nivelSigac"),
            })

        direct_result = await self.session.execute(direct_statement)
        rows.extend(
            {
                **dict(row),
                "grupo": None,
                "nivel": None,
            }
            for row in direct_result.mappings().all()
        )
        return sorted(rows, key=lambda row: ((row.get("area") or "").casefold(), (row.get("nome") or row["usuario"]).casefold(), row["usuario"].casefold()))

    async def by_status(self) -> list[dict[str, Any]]:
        result = await self.session.execute(
            select(Project.status, func.count().label("total")).group_by(Project.status)
        )
        return [dict(row) for row in result.mappings().all()]

    async def inconsistencies(
        self,
        area: str | None,
        gestor_id: str | None,
        tipo: str | None,
        user_id: str,
        all_projects: bool = False,
    ) -> list[dict[str, Any]]:
        """Relatório de inconsistências: projetos sem grupos de acesso mapeados."""
        stmt = (
            select(
                ResponsibleArea.id.label("areaId"),
                func.coalesce(ResponsibleArea.name, Project.responsible_area).label("area"),
                Project.id.label("projetoId"),
                Project.name.label("projeto"),
                Project.code.label("codigo"),
                Project.status,
                select(ProjectGroup.group_name)
                .join(
                    ProjectAccessGroup,
                    (ProjectAccessGroup.project_id == ProjectGroup.project_id)
                    & (ProjectAccessGroup.group_id == ProjectGroup.group_id),
                )
                .where(ProjectAccessGroup.project_id == Project.id)
                .order_by(ProjectGroup.group_name)
                .limit(1)
                .scalar_subquery()
                .label("grupo"),
                exists().where(
                    ProjectAccessGroup.project_id == Project.id,
                    ProjectAccessGroup.project_id == ProjectGroup.project_id,
                    ProjectAccessGroup.group_id == ProjectGroup.group_id,
                    ProjectGroup.access_level == "leitura",
                ).label("hasReadGroup"),
                exists().where(
                    ProjectAccessGroup.project_id == Project.id,
                    ProjectAccessGroup.project_id == ProjectGroup.project_id,
                    ProjectAccessGroup.group_id == ProjectGroup.group_id,
                    ProjectGroup.access_level.in_(("escrita", "administrador")),
                ).label("hasWriteGroup"),
            )
            .select_from(
                Project.__table__.outerjoin(
                    ResponsibleArea, Project.responsible_area == ResponsibleArea.id
                )
            )
            .where(
                or_(
                    ~exists().where(
                        ProjectAccessGroup.project_id == Project.id,
                        ProjectAccessGroup.project_id == ProjectGroup.project_id,
                        ProjectAccessGroup.group_id == ProjectGroup.group_id,
                        ProjectGroup.access_level == "leitura",
                    ),
                    ~exists().where(
                        ProjectAccessGroup.project_id == Project.id,
                        ProjectAccessGroup.project_id == ProjectGroup.project_id,
                        ProjectAccessGroup.group_id == ProjectGroup.group_id,
                        ProjectGroup.access_level.in_(("escrita", "administrador")),
                    ),
                )
            )
        )
        if area is not None:
            stmt = stmt.where(or_(ResponsibleArea.id == area, Project.responsible_area == area))
        if gestor_id is not None:
            stmt = stmt.where(self._jsonb_like(Project.managers_ids, gestor_id))
        if not all_projects:
            stmt = stmt.where(
                or_(
                    self._jsonb_like(Project.managers_ids, user_id),
                    exists().where(
                        ProjectMember.project_id == Project.id, ProjectMember.user_id == user_id
                    ),
                )
            )
        result = await self.session.execute(stmt.order_by("area", "projeto"))
        rows = []
        for row in result.mappings().all():
            r = dict(row)
            if r["projetoId"] is None:
                r["tipo"] = "area-sem-projeto"
                r["descricao"] = "Área cadastrada sem projeto vinculado."
            elif not r["hasReadGroup"] and not r["hasWriteGroup"]:
                r["tipo"] = "projeto-sem-grupo"
                r["descricao"] = "Projeto sem grupos de leitura e escrita mapeados."
            else:
                r["tipo"] = "grupo-incompleto"
                faltante = "leitura" if not r["hasReadGroup"] else "escrita"
                r["descricao"] = f"Projeto sem grupo de {faltante} mapeado."
            if tipo is None or r["tipo"] == tipo:
                rows.append(r)
        return rows
