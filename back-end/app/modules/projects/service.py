from app.core.exceptions import ConflictException
from app.modules.projects.models import Project
from app.modules.projects.repository import ProjectRepository


class ProjectService:
    def __init__(self, repository: ProjectRepository):
        self.repository = repository

    async def list_projects(self, user_id: str, role: str) -> list[Project]:
        return await self.repository.list_visible(user_id, role)

    async def ensure_code_available(self, code: str) -> None:
        if await self.repository.find_by_code(code):
            raise ConflictException("Código de projeto já existente")
