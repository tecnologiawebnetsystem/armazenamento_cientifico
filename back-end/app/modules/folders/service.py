import asyncio
import logging
import os
from datetime import UTC, datetime
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from app.modules.folders.models import Folder
from app.modules.folders.repository import FolderRepository


logger = logging.getLogger(__name__)


class FolderService:
    def __init__(self, repository: FolderRepository):
        self.repository = repository

    # TODO(verificar com a equipe de devs): `get_folder`, `list_subfolders`, `create_folder` e
    # `delete_folder` não têm referências no repositório (varredura de 2026-10-14); podem ser
    # funcionalidade planejada. Comentados em vez de excluídos. Se voltarem, importar `uuid4` de uuid
    # e `FolderCreate` de app.modules.files.schemas.
    # async def get_folder(self, folder_id: str) -> Folder | None:
    #     return await self.repository.find_by_id(folder_id)

    async def list_folders_by_project(self, project_id: str) -> list[Folder]:
        return await self.repository.find_by_project(project_id)

    async def list_project_folders(self, project_id: str) -> list[Folder]:
        """Lista as pastas já persistidas para a área de rede.

        A rede só é acessada pela operação explícita de sincronização. Assim,
        abrir a aba Pastas é sempre uma leitura da tabela `folders`.
        """
        return await self.list_folders_by_project(project_id)

    async def sync_project_folders(self, project_id: str, created_by: str, request_id: str) -> tuple[list[Folder], int, bool, dict[str, int]]:
        logger.info("[folders] sync_start request_id=%s project_id=%s created_by=%s", request_id, project_id, created_by)
        if await self.repository.has_project_folders(project_id):
            logger.info("[folders] sync_skip_existing request_id=%s project_id=%s", request_id, project_id)
            existing = await self.repository.find_by_project(project_id)
            return existing, 0, True, await self.repository.verify_project_folders(project_id)
        project = await self.repository.find_project(project_id)
        parent_folder = (getattr(project, "parent_folder", None) or "").strip()
        if not parent_folder:
            raise ValueError("A área de rede não possui uma pasta-mãe configurada")
        root = Path(parent_folder)
        logger.info("[folders] parent_folder project_id=%s path=%s", project_id, parent_folder)
        if not root.is_dir():
            raise ValueError("A pasta-mãe não existe ou não está acessível")
        try:
            discovered = await asyncio.wait_for(
                asyncio.to_thread(self._discover_folders, project_id, root, created_by),
                timeout=300,
            )
        except asyncio.TimeoutError as error:
            raise ValueError("A atualização excedeu o limite de 5 minutos") from error
        logger.info("[folders] discovery_complete project_id=%s quantity=%d", project_id, len(discovered))
        if not discovered:
            raise ValueError("Nenhuma pasta foi encontrada na pasta-mãe")
        await self.repository.create_many(discovered, request_id)
        integrity = await self.repository.verify_project_folders(project_id)
        if integrity["total"] != len(discovered) or integrity["invalid_parents"] or integrity["invalid_kinds"]:
            raise RuntimeError(f"Integridade inválida após o commit: {integrity}")
        logger.info("[folders] sync_complete request_id=%s project_id=%s inserted=%d", request_id, project_id, len(discovered))
        return discovered, len(discovered), False, integrity

    @staticmethod
    def _discover_folders(project_id: str, root: Path, created_by: str) -> list[Folder]:
        now = datetime.now(UTC)
        discovered: list[Folder] = []
        ids_by_path: dict[str, str] = {}
        for current, dirs, _ in os.walk(root, followlinks=False):
            dirs[:] = sorted([name for name in dirs if not (Path(current) / name).is_symlink()], key=str.casefold)
            current_path = Path(current)
            if current_path == root:
                continue
            folder_id = str(uuid5(NAMESPACE_URL, f"{project_id}:{current_path}"))
            ids_by_path[str(current_path)] = folder_id
            size = 0
            try:
                for file_path in current_path.iterdir():
                    if file_path.is_file() and not file_path.is_symlink():
                        try:
                            size += file_path.stat().st_size
                        except OSError:
                            continue
            except OSError:
                pass
            discovered.append(Folder(id=folder_id, project_id=project_id,
                parent_id=ids_by_path.get(str(current_path.parent)), kind="pasta", name=current_path.name,
                created_by=created_by, created_at=now, updated_at=now, size=size))
        return discovered

    async def can_list_project(self, project_id: str, user_id: str, role: str) -> bool:
        return await self.repository.can_view_project(project_id, user_id, role)

    async def project_exists(self, project_id: str) -> bool:
        return await self.repository.project_exists(project_id)

    # async def list_subfolders(self, parent_id: str) -> list[Folder]:
    #     return await self.repository.list_by_parent(parent_id)
    #
    # async def create_folder(self, data: FolderCreate) -> Folder:
    #     now = datetime.now(UTC)
    #     folder = Folder(
    #         id=str(uuid4()),
    #         name=data.name,
    #         project_id=data.project_id,
    #         parent_id=data.parent_id,
    #         kind=data.kind,
    #         mime_type=data.mime_type,
    #         created_by=data.created_by,
    #         created_at=now,
    #         updated_at=now,
    #         size=0,
    #     )
    #     return await self.repository.create(folder)
    #
    # async def delete_folder(self, folder_id: str) -> bool:
    #     return await self.repository.delete(folder_id)
