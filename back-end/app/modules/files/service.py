from .repository import FileRepository


class FileService:
    def __init__(self, repository: FileRepository):
        self.repository = repository

    async def list_files(self, project_id: str, parent_id: str | None, all_folders: bool):
        return await self.repository.list_by_project(project_id, parent_id, all_folders)
