from uuid import uuid4
from datetime import UTC, datetime

from app.modules.files.models import Folder
from app.modules.files.repository import FolderRepository
from app.modules.files.schemas import FolderCreate


class FolderService:
    def __init__(self, repository: FolderRepository):
        self.repository = repository

    async def get_folder(self, folder_id: str) -> Folder | None:
        return await self.repository.find_by_id(folder_id)

    async def list_folders_by_project(self, project_id: str) -> list[Folder]:
        return await self.repository.find_by_project(project_id)

    async def list_subfolders(self, parent_id: str) -> list[Folder]:
        return await self.repository.list_by_parent(parent_id)

    async def create_folder(self, data: FolderCreate) -> Folder:
        now = datetime.now(UTC).replace(tzinfo=None)
        folder = Folder(
            id=str(uuid4()),
            name=data.name,
            project_id=data.project_id,
            parent_id=data.parent_id,
            kind=data.kind,
            mime_type=data.mime_type,
            created_by=data.created_by,
            created_at=now,
            updated_at=now,
            size_bytes=0,
        )
        return await self.repository.create(folder)

    async def delete_folder(self, folder_id: str) -> bool:
        return await self.repository.delete(folder_id)
