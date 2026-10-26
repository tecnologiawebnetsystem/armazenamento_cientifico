import asyncio
import os
from datetime import UTC, datetime
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from app.modules.folders.models import Folder
from app.modules.folders.repository import FolderRepository


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
        """Lista somente as pastas imediatamente dentro do caminho do projeto.

        A leitura do compartilhamento Windows acontece em uma thread para não
        bloquear o FastAPI. Se o caminho não estiver disponível, a tabela local
        continua sendo a fonte de fallback.
        """
        project = await self.repository.find_project(project_id)
        parent_folder = (project.parent_folder if project else "").strip()
        if not parent_folder:
<<<<<<< HEAD
            return await self.list_folders_by_project(project_id)
=======
            raise ValueError("A área de rede não possui uma pasta-mãe configurada")
        root = Path(parent_folder)
        logger.info("[folders] parent_folder project_id=%s path=%s", project_id, parent_folder)
        logger.info(
            "[folders] filesystem_identity user=%s platform=%s cwd=%s path_exists_check_start",
            getpass.getuser(), os.name, os.getcwd(),
        )
        existing_ids = await self.repository.existing_ids(project_id)
        if existing_ids:
            persisted = await self.repository.find_by_project(project_id)
            integrity = await self.repository.verify_project_folders(project_id)
            mark("sync_plan", "already_registered", existing=len(existing_ids))
            mark("integrity", "ok", **integrity)
            logger.info(
                "[folders] sync_skipped_existing request_id=%s project_id=%s total=%d",
                request_id,
                project_id,
                len(persisted),
            )
            return persisted, 0, True, integrity, trace
>>>>>>> 33cbed5a06fed112663f5d7e303d54260c0b6755

        try:
            folders = await asyncio.wait_for(
                asyncio.to_thread(self._read_root_folders, project_id, parent_folder),
                timeout=45,
            )
<<<<<<< HEAD
            return folders if folders else await self.list_folders_by_project(project_id)
        except Exception:  # noqa: BLE001 - UNC pode lançar exceções do Windows sem tipo documentado
            # Compartilhamentos UNC podem falhar com exceções específicas do
            # Windows (ou permanecer indisponíveis sem gerar OSError). A API
            # deve continuar respondendo usando a tabela local como fallback.
            return await self.list_folders_by_project(project_id)
=======
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
>>>>>>> 33cbed5a06fed112663f5d7e303d54260c0b6755

    @staticmethod
    def _read_root_folders(project_id: str, parent_folder: str) -> list[Folder]:
        root = Path(parent_folder)
        if not root.is_dir():
            return []

        now = datetime.now(UTC)
        with os.scandir(root) as directory:
            entries = sorted(
                (entry for entry in directory if entry.is_dir(follow_symlinks=False)),
                key=lambda entry: entry.name.casefold(),
            )

        return [
            Folder(
                id=str(uuid5(NAMESPACE_URL, f"{project_id}:{entry.path}")),
                project_id=project_id,
                parent_id=None,
                kind="pasta",
                name=entry.name,
                created_by="filesystem",
                created_at=now,
                updated_at=now,
                size=0,
            )
            for entry in entries
        ]

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
