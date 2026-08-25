from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import File


class FileRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_by_project(self, project_id: str, parent_id: str | None, all_folders: bool) -> list[File]:
        query = select(File).where(File.project_id == project_id).order_by(File.kind, File.name)
        if not all_folders:
            query = query.where(File.parent_id == parent_id)
        return list((await self.session.scalars(query)).all())

    async def find_by_id(self, file_id: str) -> File | None:
        return await self.session.get(File, file_id)

    async def create(self, file: File) -> File:
        self.session.add(file)
        await self.session.flush()
        return file

    async def delete(self, file: File) -> None:
        await self.session.delete(file)
        await self.session.flush()
