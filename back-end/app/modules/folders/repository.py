import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.folders.models import Folder


logger = logging.getLogger(__name__)


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

    async def has_project_folders(self, project_id: str) -> bool:
        return await self.session.scalar(select(Folder.id).where(Folder.project_id == project_id).limit(1)) is not None

    async def create_many(self, folders: list[Folder]) -> None:
        logger.info("[folders] iniciando insert em lote: quantidade=%d", len(folders))
        self.session.add_all(folders)
        await self.session.flush()
        await self.session.commit()
        logger.info("[folders] transação confirmada: quantidade=%d", len(folders))
        for index, folder in enumerate(folders, start=1):
            logger.info(
                "[folders] insert concluído: item=%d/%d id=%s project_id=%s parent_id=%s nome=%r tamanho_bytes=%s",
                index,
                len(folders),
                folder.id,
                folder.project_id,
                folder.parent_id,
                folder.name,
                folder.size,
            )
        logger.info("[folders] insert em lote finalizado: quantidade=%d", len(folders))

    async def project_exists(self, project_id: str) -> bool:
        from app.modules.projects.models import Project
        return await self.session.scalar(select(Project.id).where(Project.id == project_id)) is not None

    async def find_project(self, project_id: str):
        from app.modules.projects.models import Project
        return await self.session.scalar(select(Project).where(Project.id == project_id))

    async def can_view_project(self, project_id: str, user_id: str, role: str) -> bool:
        from app.modules.projects.repository import ProjectRepository
        return await ProjectRepository(self.session).can_view(project_id, user_id, role)

    # TODO(verificar com a equipe de devs): sem referências no repositório (varredura de 2026-10-14);
    # comentado em vez de excluído.
    # async def find_by_path(self, project_id: str, path: str) -> Folder | None:
    #     return await self.session.scalar(
    #         select(Folder).where(
    #             Folder.project_id == project_id, Folder.name == path
    #         )
    #     )

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
