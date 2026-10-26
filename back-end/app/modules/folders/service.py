import asyncio
import getpass
import logging
import os
import time
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

    async def sync_project_folders(self, project_id: str, created_by: str, request_id: str) -> tuple[list[Folder], int, bool, dict[str, int], list[dict[str, object]]]:
        started_at = time.perf_counter()
        trace: list[dict[str, object]] = []
        def mark(stage: str, status: str, **details: object) -> None:
            event = {"stage": stage, "status": status, "elapsed_ms": round((time.perf_counter() - started_at) * 1000, 2), **details}
            trace.append(event)
            logger.info("[folders] trace request_id=%s event=%s", request_id, event)
        mark("sync", "started", project_id=project_id)
        logger.info("[folders] sync_start request_id=%s project_id=%s created_by=%s", request_id, project_id, created_by)
        project = await self.repository.find_project(project_id)
        mark("project", "ok", found=project is not None)
        parent_folder = (getattr(project, "parent_folder", None) or "").strip()
        if not parent_folder:
            raise ValueError("A área de rede não possui uma pasta-mãe configurada")
        root = Path(parent_folder)
        logger.info("[folders] parent_folder project_id=%s path=%s", project_id, parent_folder)
        logger.info(
            "[folders] filesystem_identity user=%s platform=%s cwd=%s path_exists_check_start",
            getpass.getuser(), os.name, os.getcwd(),
        )
        try:
            discovered = await asyncio.wait_for(
                asyncio.to_thread(self._discover_folders, project_id, root, created_by),
                timeout=60,
            )
        except asyncio.TimeoutError as error:
            logger.error(
                "[folders] discovery_timeout request_id=%s project_id=%s path=%s timeout_seconds=60",
                request_id, project_id, parent_folder,
            )
            raise ValueError(
                "A pasta-mãe não respondeu em 60 segundos. Verifique acesso à rede, VPN, credenciais e disponibilidade do DFS."
            ) from error
        mark("filesystem_discovery", "ok", discovered=len(discovered), path=parent_folder)
        logger.info("[folders] discovery_complete request_id=%s project_id=%s quantity=%d", request_id, project_id, len(discovered))
        if not discovered:
            raise ValueError("Nenhuma pasta foi encontrada na pasta-mãe")
        existing_ids = await self.repository.existing_ids(project_id)
        pending = [folder for folder in discovered if folder.id not in existing_ids]
        mark("sync_plan", "ok", discovered=len(discovered), existing=len(existing_ids), pending=len(pending))
        logger.info(
            "[folders] sync_plan request_id=%s project_id=%s discovered=%d existing=%d pending=%d",
            request_id, project_id, len(discovered), len(existing_ids), len(pending),
        )
        total = len(pending)
        for index, folder in enumerate(pending, start=1):
            try:
                await self.repository.create_one(folder, request_id, index, total)
            except Exception as error:
                logger.exception(
                    "[folders] sync_insert_failed request_id=%s project_id=%s item=%d/%d nome=%r",
                    request_id, project_id, index, total, folder.name,
                )
                raise RuntimeError(
                    f"Falha no insert da pasta {index}/{total} ({folder.name!r}): {type(error).__name__}"
                ) from error
        mark("database_inserts", "ok", inserted=len(pending))
        integrity = await self.repository.verify_project_folders(project_id)
        mark("integrity", "ok", **integrity)
        if integrity["total"] != len(discovered) or integrity["invalid_parents"] or integrity["invalid_kinds"]:
            raise RuntimeError(f"Integridade inválida após o commit: {integrity}")
        logger.info("[folders] sync_complete request_id=%s project_id=%s inserted=%d total=%d", request_id, project_id, len(pending), len(discovered))
        mark("sync", "completed", inserted=len(pending), total=len(discovered))
        return discovered, len(pending), len(pending) == 0, integrity, trace

    @staticmethod
    def _discover_folders(project_id: str, root: Path, created_by: str) -> list[Folder]:
        logger.info("[folders] filesystem_is_dir_start path=%s", root)
        if not root.is_dir():
            logger.warning("[folders] filesystem_is_dir_false path=%s", root)
            raise ValueError("A pasta-mãe não existe ou não está acessível")
        logger.info("[folders] filesystem_is_dir_ok path=%s", root)
        now = datetime.now(UTC)
        discovered: list[Folder] = []
        ids_by_path: dict[str, str] = {}
        logger.info("[folders] filesystem_walk_start path=%s", root)
        for current, dirs, _ in os.walk(root, followlinks=False):
            logger.info("[folders] filesystem_walk_entry current=%s dirs=%d", current, len(dirs))
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
        logger.info("[folders] filesystem_walk_complete path=%s discovered=%d", root, len(discovered))
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
