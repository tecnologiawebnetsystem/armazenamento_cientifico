from .repository import FolderRepository


class FolderService:
    def __init__(self, repository: FolderRepository):
        self.repository = repository

    async def list_folders(self, project_id: str):
        return await self.repository.list_by_project(project_id)
