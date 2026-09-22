from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.files.models import Folder


class FolderRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def find_by_id(self, folder_id: str) -> Folder | None:
        return await self.session.scalar(select(Folder).where(Folder.id == folder_id))

    async def find_by_project(self, project_id: str) -> list[Folder]:
        result = await self.session.scalars(
            select(Folder)
            .where(Folder.project_id == project_id, Folder.kind.in_(("pasta", "folder")))
            .order_by(Folder.name)
        )
        return list(result)

    async def project_exists(self, project_id: str) -> bool:
        from app.modules.projects.models import Project
        return await self.session.scalar(select(Project.id).where(Project.id == project_id)) is not None

    async def can_view_project(self, project_id: str, user_id: str, role: str) -> bool:
        from app.modules.projects.repository import ProjectRepository
        return await ProjectRepository(self.session).can_view(project_id, user_id, role)

    async def find_by_path(self, project_id: str, path: str) -> Folder | None:
        return await self.session.scalar(
            select(Folder).where(
                Folder.project_id == project_id, Folder.name == path
            )
        )

    async def list_by_parent(self, parent_id: str) -> list[Folder]:
        result = await self.session.scalars(
            select(Folder).where(Folder.parent_id == parent_id).order_by(Folder.name)
        )
        return list(result)

    async def create(self, folder: Folder) -> Folder:
        self.session.add(folder)
        await self.session.flush()
        return folder

    async def update(self, folder: Folder) -> Folder:
        await self.session.merge(folder)
        await self.session.flush()
        return folder

    async def delete(self, folder_id: str) -> bool:
        folder = await self.find_by_id(folder_id)
        if folder:
            await self.session.delete(folder)
            await self.session.flush()
            return True
        return False
