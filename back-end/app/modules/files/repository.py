from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Folder


class FolderRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_by_project(self, project_id: str) -> list[Folder]:
        query = select(Folder).where(Folder.project_id == project_id).where(Folder.kind == "pasta").order_by(Folder.name)
        return list((await self.session.scalars(query)).all())
