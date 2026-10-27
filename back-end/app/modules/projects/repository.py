from sqlalchemy import exists, func, select

from app.modules.folders.models import Folder
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalogs.models import ResponsibleArea
from app.modules.projects.models import Project, ProjectMember
from app.modules.users.models import User


class ProjectRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def find_by_id(self, project_id: str) -> Project | None:
        return await self.session.scalar(select(Project).where(Project.id == project_id))

    async def find_by_code(self, code: str) -> Project | None:
        return await self.session.scalar(select(Project).where(Project.code == code))

    async def list_visible(self, user_id: str, role: str) -> list[Project]:
        statement = select(Project).order_by(Project.updated_at.desc())
        if role not in {"admin", "patrocinador", "auditor"}:
            statement = statement.where(
                (Project.managers_ids.contains([user_id]))
                | exists().where(ProjectMember.project_id == Project.id, ProjectMember.user_id == user_id)
            )

        projects = list(await self.session.scalars(statement))
        if not projects:
            return projects

        project_ids = [project.id for project in projects]
        member_rows = await self.session.execute(
            select(ProjectMember.project_id, ProjectMember.user_id)
            .where(ProjectMember.project_id.in_(project_ids))
        )
        members_by_project: dict[str, list[str]] = {}
        for project_id, member_id in member_rows:
            members_by_project.setdefault(project_id, []).append(member_id)

        for project in projects:
            project.participants_ids = members_by_project.get(project.id, [])

        return projects

    async def storage_by_project_ids(self, project_ids: list[str]) -> dict[str, int]:
        if not project_ids:
            return {}
        rows = await self.session.execute(
            select(Folder.project_id, func.coalesce(func.sum(Folder.size), 0))
            .where(Folder.project_id.in_(project_ids))
            .group_by(Folder.project_id)
        )
        return {project_id: int(total or 0) for project_id, total in rows}

    async def can_view(self, project_id: str, user_id: str, role: str) -> bool:
        if role in {"admin", "patrocinador", "auditor"}:
            return True
        project = await self.find_by_id(project_id)
        if not project:
            return False
        if user_id in (project.managers_ids or []) or user_id in (project.participants_ids or []):
            return True
        return bool(await self.session.scalar(select(ProjectMember.project_id).where(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id)))

    async def lock_active_area(self, name: str) -> ResponsibleArea | None:
        return await self.session.scalar(
            select(ResponsibleArea)
            .where(ResponsibleArea.name == name, ResponsibleArea.active.is_(True))
            .with_for_update()
        )

    async def list_active_areas(self) -> list[ResponsibleArea]:
        return list(await self.session.scalars(select(ResponsibleArea).where(ResponsibleArea.active.is_(True)).order_by(ResponsibleArea.name)))

    async def add(self, project: Project) -> Project:
        self.session.add(project)
        await self.session.flush()
        return project

    async def delete(self, project: Project) -> None:
        await self.session.delete(project)

    async def commit(self) -> None:
        try:
            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise

    async def list_users_by_ids(self, user_ids: list[str]) -> list[User]:
        if not user_ids:
            return []
        statement = (
            select(User)
            .where((User.id.in_(user_ids)) | (User.user_id.in_(user_ids)))
            .order_by(User.user_id)
        )
        return list(await self.session.scalars(statement))

    async def list_members(self, project_id: str) -> list[tuple[ProjectMember, User]]:
        statement = (
            select(ProjectMember, User)
            .join(User, User.id == ProjectMember.user_id)
            .where(ProjectMember.project_id == project_id)
            .order_by(User.user_id)
        )
        return list((await self.session.execute(statement)).all())


# TODO(verificar com a equipe de devs): `ProjectAccessRepository` e `touch` não têm referências no
# repositório (varredura de 2026-10-14); comentados em vez de excluídos. Se voltarem, importar
# `datetime` de datetime.
# class ProjectAccessRepository:
#     def __init__(self, repository: ProjectRepository):
#         self.repository = repository
#
#     async def list_members(self, project_id: str) -> list[tuple[ProjectMember, User]]:
#         return await self.repository.list_members(project_id)
#
#     async def commit(self) -> None:
#         await self.repository.commit()
#
#
# def touch(entity: Project | ResponsibleArea, timestamp: datetime) -> None:
#     entity.updated_at = timestamp
