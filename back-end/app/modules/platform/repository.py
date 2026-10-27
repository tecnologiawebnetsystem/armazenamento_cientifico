from datetime import UTC, datetime
from typing import Any

from sqlalchemy import and_, func, literal_column, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.modules.catalogs.models import (
    DashboardCard,
    MenuItem,
    MenuPermission,
    Module,
    Permission,
    ProfileModule,
    ProfilePermission,
)
from app.modules.folders.models import Folder
from app.modules.projects.models import Project, ProjectMember
from app.modules.users.models import User


class PlatformRepository:
    """Contexto da plataforma: menus, permissões, dashboard e mapa de acessos."""

    def __init__(self, session: AsyncSession):
        self.session = session

    # ── context (ORM) ─────────────────────────────────────────────────

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

        permissions = list((await self.session.execute(
            select(Permission.id)
            .join(ProfilePermission, ProfilePermission.permission_id == Permission.id)
            .where(
                ProfilePermission.profile_id == profile_id,
                ProfilePermission.allowed.is_(True),
                Permission.active.is_(True),
            )
        )).scalars())

        modules = [dict(row) for row in (await self.session.execute(
            select(
                Module.id, Module.name.label("nome"), Module.route.label("rota"),
                Module.icon.label("icone"), Module.display_order.label("ordem"),
            )
            .select_from(ProfileModule.__table__.join(Module, Module.id == ProfileModule.module_id))
            .where(ProfileModule.profile_id == profile_id, ProfileModule.can_view.is_(True), Module.active.is_(True))
            .order_by(Module.display_order, Module.name)
        )).mappings().all()]

        visible_module = (
            select(ProfileModule.module_id)
            .where(ProfileModule.profile_id == profile_id, ProfileModule.can_view.is_(True))
        ).scalar_subquery()

        menu_with_permission = (
            select(1)
            .select_from(MenuPermission.__table__.join(ProfilePermission,
                ProfilePermission.permission_id == MenuPermission.permission_id))
            .join(Permission, Permission.id == MenuPermission.permission_id)
            .where(
                MenuPermission.menu_id == MenuItem.id,
                MenuPermission.allowed.is_(True),
                ProfilePermission.profile_id == profile_id,
                ProfilePermission.allowed.is_(True),
                Permission.module_id == MenuItem.module_id,
                Permission.active.is_(True),
            )
        ).exists()

        menus = [dict(row) for row in (await self.session.execute(
            select(
                MenuItem.id, MenuItem.name.label("nome"), MenuItem.route.label("rota"),
                MenuItem.icon.label("icone"), MenuItem.display_order.label("ordem"),
                MenuItem.parent_id,
            )
            .outerjoin(Module, and_(Module.id == MenuItem.module_id, Module.active.is_(True)))
            .where(
                MenuItem.active.is_(True),
                or_(
                    MenuItem.module_id.is_(None),
                    and_(MenuItem.module_id.in_(visible_module), Module.id.is_not(None)),
                ),
                or_(
                    MenuItem.module_id.is_(None),
                    menu_with_permission,
                ),
            )
            .order_by(MenuItem.display_order, MenuItem.name)
        )).mappings().all()]

        cards = [dict(row) for row in (await self.session.execute(
            select(
                DashboardCard.id, DashboardCard.key, DashboardCard.title.label("titulo"),
                DashboardCard.description.label("descricao"), DashboardCard.metric_key.label("metrica"),
                DashboardCard.route.label("rota"), DashboardCard.display_order.label("ordem"),
            )
            .where(
                DashboardCard.active.is_(True),
                or_(
                    DashboardCard.profile_ids == "",
                    DashboardCard.profile_ids.like(f"%{profile_id}%"),
                ),
            )
            .order_by(DashboardCard.display_order, DashboardCard.title)
        )).mappings().all()]

        return {"user": user, "permissions": permissions, "modules": modules, "menus": menus, "dashboardCards": cards}

    # ── dashboard (ORM) ───────────────────────────────────────────────

    async def dashboard(self) -> dict[str, Any]:
        bytes_per_mb = 1024 * 1024
        storage_sub = select(func.coalesce(func.sum(Folder.size), 0) / bytes_per_mb).where(Folder.project_id == Project.id).correlate(Project).scalar_subquery()
        projects = [dict(row) for row in (await self.session.execute(
            select(Project.id, Project.name.label("nome"), Project.code.label("codigo"),
                   Project.responsible_area.label("areaResponsavel"), Project.status,
                   Project.description.label("descricao"), Project.created_at.label("criadoEm"),
                   Project.updated_at.label("atualizadoEm"), storage_sub.label("armazenamentoUsadoMb"))
            .order_by(Project.updated_at.desc())
        )).mappings().all()]

        counts_result = (await self.session.execute(
            select(
                func.count(func.distinct(ProjectMember.project_id)).label("membros"),
                func.count(func.distinct(Folder.id)).label("mapas"),
                (func.coalesce(func.sum(Folder.size), 0) / bytes_per_mb).label("armazenamento"),
            )
        )).mappings().first()
        counts = dict(counts_result) if counts_result else {"membros": 0, "mapas": 0, "armazenamento": 0}

        from app.modules.audit.models import ActivityLog

        activity = [dict(row) for row in (await self.session.execute(
            select(ActivityLog.id, ActivityLog.user_id.label("userId"),
                   ActivityLog.action.label("acao"), ActivityLog.entity.label("entidade"),
                   ActivityLog.entity_id.label("entidadeId"), ActivityLog.details.label("detalhes"),
                   ActivityLog.created_at.label("criadoEm"), ActivityLog.result.label("resultado"),
                   ActivityLog.project_id.label("projetoId"))
            .order_by(ActivityLog.created_at.desc())
            .limit(10)
        )).mappings().all()]

        return {
            "projects": projects, "totalMembros": counts["membros"],
            "totalMapas": counts["mapas"], "armazenamentoMb": counts["armazenamento"],
            "activity": activity, "source": "database",
            "consultedAt": datetime.now(UTC).isoformat(),
        }

    # ── access_map (ORM) ──────────────────────────────────────────────

    async def access_map(self) -> dict[str, Any]:
        pa = aliased(Project)
        rows = [dict(row) for row in (await self.session.execute(
            select(
                ProjectMember.user_id.label("userId"),
                func.coalesce(User.user_id, ProjectMember.user_id).label("userName"),
                pa.id.label("projectId"), pa.name.label("projectName"),
                pa.status.label("projectStatus"), Folder.id.label("resourceId"),
                Folder.name.label("resourceName"), literal_column("'pasta'").label("resourceType"),
                ProjectMember.role.label("accessLevel"), Folder.updated_at.label("lastViewedAt"),
            )
            .select_from(ProjectMember.__table__
                .join(pa, pa.id == ProjectMember.project_id)
                .outerjoin(User, User.id == ProjectMember.user_id)
                .outerjoin(Folder, Folder.project_id == pa.id))
            .order_by(pa.name, User.user_id)
        )).mappings().all()]

        for row in rows:
            row["resourceType"] = "pasta"

        return {
            "source": "database", "consultedAt": datetime.now(UTC).isoformat(),
            "summary": {
                "users": len({r["userId"] for r in rows}),
                "projects": len({r["projectId"] for r in rows}),
                "folders": len([r for r in rows if r["resourceId"]]),
                "files": 0, "relationships": len(rows),
            },
            "rows": rows,
        }
