from datetime import UTC, datetime
from uuid import uuid4

from app.core.exceptions import ConflictException
from app.modules.projects.models import Project, ProjectAccessGroup, ProjectGroup
from app.modules.projects.repository import ProjectRepository
from app.modules.projects.schemas import (
    AccessGroupCreate,
    AccessGroupPatch,
    ProjectCreate,
    ProjectPatch,
)


class ProjectService:
    def __init__(self, repository: ProjectRepository):
        self.repository = repository

    async def list_projects(self, user_id: str, role: str) -> list[Project]:
        return await self.repository.list_visible(user_id, role)

    async def storage_by_project_ids(self, project_ids: list[str]) -> dict[str, int]:
        return await self.repository.storage_by_project_ids(project_ids)

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
        now = datetime.now(UTC).replace(tzinfo=None)
        area.updated_at = now
        project = Project(
            id=str(uuid4()),
            name=data.nome,
            code=generated_code,
            responsible_area=data.areaResponsavel,
            managers_ids=data.gestoresIds,
            description=data.descricao,
            status=data.status,
            participants_ids=data.participantesIds,
            write_group="",
            read_group="",
            write_identity_role="",
            read_identity_role="",
            snow_task_number=data.numeroTarefaSnow,
            parent_folder=data.pastaMae,
            created_at=now,
            updated_at=now,
        )
        await self.repository.add(project)

        principals = list(data.gruposAcesso)
        for access_level, values, principal_type in (
            ("leitura", data.grupoAdLeitura, "group"),
            ("escrita", data.grupoAdEscrita, "group"),
            ("leitura", data.roleIdentidadeLeitura, "role"),
            ("escrita", data.roleIdentidadeEscrita, "role"),
        ):
            principals.extend(
                AccessGroupCreate(
                    groupName=value.strip(),
                    identifier=value.strip(),
                    principalType=principal_type,
                    accessLevel=access_level,
                )
                for value in values.split(",")
                if value.strip()
            )

        seen: set[tuple[str, str, str]] = set()
        for group_data in principals:
            key = (
                group_data.principalType,
                group_data.identifier.casefold(),
                group_data.accessLevel,
            )
            if key in seen:
                continue
            seen.add(key)
            await self._add_access_group(project.id, group_data, now)

        await self.repository.commit()
        return project

    async def update_project(self, project_id: str, data: ProjectPatch) -> Project:
        project = await self.repository.find_by_id(project_id)
        if not project:
            raise LookupError("Projeto não encontrado")
        values = {
            "name": data.nome,
            "responsible_area": data.areaResponsavel,
            "parent_folder": data.pastaMae,
            "description": data.descricao,
            "status": data.status,
        }
        for key, value in values.items():
            if value is not None:
                setattr(project, key, value)
        project.updated_at = datetime.now(UTC).replace(tzinfo=None)
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

    async def list_users_by_ids(self, user_ids: list[str]):
        return await self.repository.list_users_by_ids(user_ids)

    # ── Project groups and associations ──────────────────────────────

    async def list_access_groups(
        self, project_id: str, access_level: str | None = None
    ) -> list[tuple[ProjectGroup, ProjectAccessGroup]]:
        return await self.repository.list_access_groups(project_id, access_level)

    async def search_catalog_groups(
        self, principal_type: str, search: str
    ) -> list[ProjectGroup]:
        return await self.repository.search_catalog_groups(principal_type, search)

    async def _add_access_group(
        self, project_id: str, data: AccessGroupCreate, now: datetime
    ) -> tuple[ProjectGroup, ProjectAccessGroup]:
        normalized_identifier = data.identifier.strip()
        for group, _association in await self.repository.list_access_groups(project_id):
            if (
                group.principal_type == data.principalType
                and group.identifier.casefold() == normalized_identifier.casefold()
            ):
                raise ConflictException("Este principal já está vinculado a este projeto")

        principal = await self.repository.find_catalog_group(
            project_id, data.principalType, normalized_identifier
        )
        if principal is None:
            principal = ProjectGroup(
                group_id=str(uuid4()),
                project_id=project_id,
                identifier=normalized_identifier,
                group_name=data.groupName.strip(),
                principal_type=data.principalType,
                access_level=data.accessLevel,
                source="manual",
                created_at=now,
                updated_at=now,
            )
            await self.repository.add_project_group(principal)

        association = ProjectAccessGroup(
            project_id=project_id,
            group_id=principal.group_id,
        )
        await self.repository.add_access_group(association)
        return principal, association

    async def create_access_group(
        self, project_id: str, data: AccessGroupCreate
    ) -> tuple[ProjectGroup, ProjectAccessGroup]:
        project = await self.repository.find_by_id(project_id)
        if not project:
            raise LookupError("Projeto não encontrado")
        now = datetime.now(UTC).replace(tzinfo=None)
        result = await self._add_access_group(project_id, data, now)
        await self.repository.commit()
        return result

    async def update_access_group(
        self, project_id: str, access_group_id: str, data: AccessGroupPatch
    ) -> tuple[ProjectGroup, ProjectAccessGroup]:
        result = await self.repository.find_access_group_by_id(project_id, access_group_id)
        if not result:
            raise LookupError("Principal de acesso não encontrado neste projeto")
        principal, association = result
        principal.access_level = data.accessLevel
        principal.updated_at = datetime.now(UTC).replace(tzinfo=None)
        await self.repository.commit()
        return principal, association

    async def delete_access_group(self, project_id: str, access_group_id: str) -> bool:
        result = await self.repository.find_access_group_by_id(project_id, access_group_id)
        if not result:
            return False
        await self.repository.delete_access_group(result[0], result[1])
        await self.repository.commit()
        return True
