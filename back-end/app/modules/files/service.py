from datetime import UTC, datetime
from uuid import uuid4

from app.core.exceptions import NotFoundException

from .models import File
from .repository import FileRepository
from .schemas import FileCreate, FileUpdate


class FileService:
    def __init__(self, repository: FileRepository):
        self.repository = repository

    async def list_files(self, project_id: str, parent_id: str | None, all_folders: bool):
        return await self.repository.list_by_project(project_id, parent_id, all_folders)

    async def create_file(self, data: FileCreate, user_id: str):
        now = datetime.now(UTC)
        return await self.repository.create(
            File(
                id=str(uuid4()),
                project_id=data.project_id,
                parent_id=data.parent_id,
                kind=data.kind,
                name=data.name,
                size_bytes=data.size_bytes,
                mime_type=data.mime_type,
                created_by=user_id,
                created_at=now,
                updated_at=now,
            )
        )

    async def update_file(self, file_id: str, data: FileUpdate):
        file = await self.repository.find_by_id(file_id)
        if not file:
            raise NotFoundException("Arquivo não encontrado")
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(file, key, value)
        file.updated_at = datetime.now(UTC)
        return file

    async def delete_file(self, file_id: str):
        file = await self.repository.find_by_id(file_id)
        if not file:
            raise NotFoundException("Arquivo não encontrado")
        await self.repository.delete(file)
