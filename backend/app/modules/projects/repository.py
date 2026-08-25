from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.projects.models import Project


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
                (Project.managers_ids.any(user_id)) | (Project.participants_ids.any(user_id))
            )
        result = await self.session.scalars(statement)
        return list(result)
