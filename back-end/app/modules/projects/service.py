from datetime import UTC, datetime
from uuid import uuid4

from app.core.exceptions import ConflictException
from app.modules.projects.models import Project
from app.modules.projects.repository import ProjectRepository
from app.modules.projects.schemas import ProjectCreate, ProjectPatch


class ProjectService:
    def __init__(self, repository: ProjectRepository):
        self.repository = repository

    async def list_projects(self, user_id: str, role: str) -> list[Project]:
        return await self.repository.list_visible(user_id, role)

    async def ensure_code_available(self, code: str) -> None:
        if await self.repository.find_by_code(code):
            raise ConflictException("Código de projeto já existente")

    async def create_project(self, data: ProjectCreate) -> Project:
        area = await self.repository.lock_active_area(data.areaResponsavel)
        if not area:
            raise ValueError("Área responsável inválida ou inativa")
        generated_code = area.consume_code()
        if data.codigo and data.codigo != generated_code:
            raise ValueError("O código é gerado automaticamente pela área responsável")
        await self.ensure_code_available(generated_code)
        now = datetime.now(UTC)
        area.updated_at = now
        project = Project(
            id=str(uuid4()), name=data.nome, code=generated_code,
            responsible_area=data.areaResponsavel, managers_ids=data.gestoresIds,
            description=data.descricao, status=data.status,
            participants_ids=data.participantesIds, write_group=data.grupoAdEscrita,
            read_group=data.grupoAdLeitura, write_identity_role=data.roleIdentidadeEscrita,
            read_identity_role=data.roleIdentidadeLeitura, snow_task_number=data.numeroTarefaSnow,
            parent_folder=data.pastaMae, created_at=now, updated_at=now,
        )
        await self.repository.add(project)
        await self.repository.commit()
        return project

    async def update_project(self, project_id: str, data: ProjectPatch) -> Project:
        project = await self.repository.find_by_id(project_id)
        if not project:
            raise LookupError("Projeto não encontrado")
        values = {
            "name": data.nome, "responsible_area": data.areaResponsavel,
            "description": data.descricao, "status": data.status,
            "write_group": data.grupoAdEscrita, "read_group": data.grupoAdLeitura,
            "write_identity_role": data.roleIdentidadeEscrita,
            "read_identity_role": data.roleIdentidadeLeitura,
        }
        for key, value in values.items():
            if value is not None:
                setattr(project, key, value)
        project.updated_at = datetime.now(UTC)
        await self.repository.commit()
        return project

    async def delete_project(self, project_id: str) -> bool:
        project = await self.repository.find_by_id(project_id)
        if not project:
            return False
        await self.repository.delete(project)
        await self.repository.commit()
        return True

    async def get_project(self, project_id: str) -> Project | None:
        return await self.repository.find_by_id(project_id)

    async def can_view(self, project_id: str, user_id: str, role: str) -> bool:
        return await self.repository.can_view(project_id, user_id, role)

    async def list_areas(self):
        return await self.repository.list_active_areas()

    async def list_members(self, project_id: str):
        return await self.repository.list_members(project_id)
