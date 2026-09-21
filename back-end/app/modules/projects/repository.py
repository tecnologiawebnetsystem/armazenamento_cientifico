from datetime import datetime

from sqlalchemy import exists, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalogs.area_model import ResponsibleArea
from app.modules.projects.member_model import ProjectMember
from app.modules.projects.models import Project
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
        return list(await self.session.scalars(statement))

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
        await self.session.commit()

    async def list_members(self, project_id: str) -> list[tuple[ProjectMember, User]]:
        statement = (
            select(ProjectMember, User)
            .join(User, User.id == ProjectMember.user_id)
            .where(ProjectMember.project_id == project_id)
            .order_by(User.name)
        )
        return list((await self.session.execute(statement)).all())


class ProjectAccessRepository:
    def __init__(self, repository: ProjectRepository):
        self.repository = repository

    async def list_members(self, project_id: str) -> list[tuple[ProjectMember, User]]:
        return await self.repository.list_members(project_id)

    async def commit(self) -> None:
        await self.repository.commit()


def touch(entity: Project | ResponsibleArea, timestamp: datetime) -> None:
    entity.updated_at = timestamp
