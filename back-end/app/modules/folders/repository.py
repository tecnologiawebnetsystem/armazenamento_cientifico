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

    async def existing_ids(self, project_id: str) -> set[str]:
        result = await self.session.scalars(select(Folder.id).where(Folder.project_id == project_id))
        return set(result)

    async def has_project_folders(self, project_id: str) -> bool:
        return await self.session.scalar(select(Folder.id).where(Folder.project_id == project_id).limit(1)) is not None

    async def create_one(self, folder: Folder, request_id: str, index: int, total: int) -> None:
        logger.info(
            "[folders] insert_start request_id=%s item=%d/%d id=%s parent_id=%s nome=%r",
            request_id, index, total, folder.id, folder.parent_id, folder.name,
        )
        try:
            self.session.add(folder)
            await self.session.flush()
            await self.session.commit()
        except Exception:
            await self.session.rollback()
            logger.exception(
                "[folders] insert_error request_id=%s item=%d/%d id=%s parent_id=%s nome=%r",
                request_id, index, total, folder.id, folder.parent_id, folder.name,
            )
            raise
        logger.info(
            "[folders] insert_committed request_id=%s item=%d/%d id=%s nome=%r tamanho_bytes=%s",
            request_id, index, total, folder.id, folder.name, folder.size,
        )

    async def create_many(self, folders: list[Folder], request_id: str | None = None) -> None:
        logger.info("[folders] insert_batch_start request_id=%s quantidade=%d", request_id, len(folders))
        try:
            self.session.add_all(folders)
            await self.session.flush()
            await self.session.commit()
        except Exception:
            await self.session.rollback()
            logger.exception("[folders] insert_batch_rollback request_id=%s quantidade=%d", request_id, len(folders))
            raise
        logger.info("[folders] transaction_committed request_id=%s quantidade=%d", request_id, len(folders))
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

    async def verify_project_folders(self, project_id: str) -> dict[str, int]:
        result = await self.session.execute(
            select(Folder).where(Folder.project_id == project_id)
        )
        folders = list(result.scalars())
        ids = {folder.id for folder in folders}
        invalid_parents = sum(1 for folder in folders if folder.parent_id and folder.parent_id not in ids)
        invalid_kinds = sum(1 for folder in folders if folder.kind not in {"pasta", "folder"})
        logger.info(
            "[folders] integrity_check project_id=%s total=%d invalid_parents=%d invalid_kinds=%d",
            project_id, len(folders), invalid_parents, invalid_kinds,
        )
        return {"total": len(folders), "invalid_parents": invalid_parents, "invalid_kinds": invalid_kinds}

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
