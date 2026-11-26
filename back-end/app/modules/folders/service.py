import asyncio
import logging
import os
from datetime import UTC, datetime
from pathlib import Path
from time import perf_counter
from uuid import NAMESPACE_URL, uuid5

from app.core.config import get_settings
from app.infrastructure.directory import DirectoryResolver
from app.modules.folders.models import Folder
from app.modules.folders.repository import FolderRepository

logger = logging.getLogger(__name__)


class FolderSourceUnavailable(RuntimeError):
    """A raiz de rede não pôde ser enumerada com segurança."""


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

    async def read_live_project_folders(self, project_id: str) -> list[Folder] | None:
        project = await self.repository.find_project(project_id)
        parent_folder = (project.parent_folder if project else "").strip()
        if not parent_folder:
            logger.warning("folders_network_root_missing project_id=%s", project_id)
            return None

        started_at = perf_counter()
        logger.info("folders_network_scan_started project_id=%s root=%r", project_id, parent_folder)
        try:
            folders = await asyncio.wait_for(
                asyncio.to_thread(self._read_root_folders, project_id, parent_folder),
                timeout=45,
            )
        except TimeoutError as error:
            logger.warning(
                "folders_network_scan_timeout project_id=%s root=%r timeout_seconds=45 duration_ms=%.2f",
                project_id,
                parent_folder,
                (perf_counter() - started_at) * 1000,
            )
            raise FolderSourceUnavailable(
                "Tempo limite ao listar as pastas da área de rede."
            ) from error
        except Exception as error:
            logger.exception(
                "folders_network_scan_failed project_id=%s root=%r duration_ms=%.2f",
                project_id,
                parent_folder,
                (perf_counter() - started_at) * 1000,
            )
            if isinstance(error, (FileNotFoundError, NotADirectoryError)):
                raise FolderSourceUnavailable(
                    "A pasta raiz não existe ou não está acessível pelo servidor."
                ) from error
            raise FolderSourceUnavailable(
                "Não foi possível listar as pastas da área de rede."
            ) from error

        logger.info(
            "folders_network_scan_completed project_id=%s root=%r folders=%d duration_ms=%.2f",
            project_id,
            parent_folder,
            len(folders),
            (perf_counter() - started_at) * 1000,
        )
        return folders

    async def list_project_folders_with_source(self, project_id: str) -> tuple[list[Folder], str]:
        """Lista o cadastro local; a leitura da rede ocorre apenas na sincronização explícita."""
        stored_folders = await self.list_folders_by_project(project_id)
        return stored_folders, "tabela"

    async def list_project_folders(self, project_id: str) -> list[Folder]:
        folders, _source = await self.list_project_folders_with_source(project_id)
        return folders

    @staticmethod
    def _read_root_folders(project_id: str, parent_folder: str) -> list[Folder]:
        root = Path(parent_folder)
        if not root.is_dir():
            raise OSError(f"A raiz não existe ou não está acessível: {root}")

        def raise_walk_error(error: OSError) -> None:
            raise error

        now = datetime.now(UTC)
        folders: list[Folder] = []
        parent_ids: dict[str, str | None] = {str(root): None}

        for current_path, directory_names, _ in os.walk(root, onerror=raise_walk_error):
            directory_names[:] = [
                name
                for name in sorted(directory_names, key=str.casefold)
                if not (Path(current_path) / name).is_symlink()
            ]
            current_parent_id = parent_ids.get(current_path)

            for directory_name in directory_names:
                path = str(Path(current_path) / directory_name)
                folder_id = str(uuid5(NAMESPACE_URL, f"{project_id}:{path}"))
                parent_ids[path] = folder_id
                folders.append(
                    Folder(
                        id=folder_id,
                        project_id=project_id,
                        parent_id=current_parent_id,
                        kind="pasta",
                        name=directory_name,
                        created_by="filesystem",
                        created_at=now,
                        updated_at=now,
                        size=0,
                    )
                )

        return folders

    @staticmethod
    def _directory_size(path: str) -> int:
        total = 0
        try:
            for current_path, _, file_names in os.walk(path):
                for file_name in file_names:
                    try:
                        total += os.stat(
                            os.path.join(current_path, file_name), follow_symlinks=False
                        ).st_size
                    except OSError:
                        continue
        except OSError:
            return 0
        return total

    async def sync_project_folders(
        self, project_id: str, user_id: str, folders: list[dict] | str
    ) -> tuple[list[Folder], int, bool, dict, dict]:
        project = await self.repository.find_project(project_id)
        parent_folder = (project.parent_folder if project else "").strip()
        if not parent_folder:
            raise ValueError("O projeto não possui pasta raiz de rede cadastrada.")
        if not hasattr(self.repository, "reconcile"):
            root_exists = await asyncio.to_thread(Path(parent_folder).is_dir)
            if not root_exists:
                raise FolderSourceUnavailable(
                    "A pasta raiz não existe ou não está acessível pelo servidor."
                )
            return await self._sync_legacy(project_id, user_id, str(folders))

        source = "rede"
        live_folders = await self.read_live_project_folders(project_id)
        if live_folders is not None:
            logger.info(
                "folders_sync_stage project_id=%s stage=network_scan_complete folders=%d",
                project_id,
                len(live_folders),
            )
            source_folders = [
                {
                    "id": folder.id,
                    "name": folder.name,
                    "parent_id": folder.parent_id,
                    "kind": folder.kind,
                    "size_bytes": folder.size,
                }
                for folder in live_folders
            ]
        else:
            raise FolderSourceUnavailable(
                "A consulta à pasta de rede não retornou uma lista atualizada."
            )

        logger.info(
            "folders_sync_stage project_id=%s stage=load_existing_folders incoming=%d",
            project_id,
            len(source_folders),
        )
        existing = list(await self.repository.find_by_project(project_id))
        logger.info(
            "folders_sync_stage project_id=%s stage=existing_folders_loaded total=%d",
            project_id,
            len(existing),
        )
        now = datetime.now(UTC)
        if existing:
            logger.info(
                "folders_sync_stage project_id=%s stage=reconcile_existing_folders existing=%d incoming=%d",
                project_id,
                len(existing),
                len(source_folders),
            )
            updated = await self.repository.reconcile(existing, source_folders, now)
            logger.info(
                "folders_sync_stage project_id=%s stage=existing_folders_reconciled updated=%d",
                project_id,
                updated,
            )
            existing_ids = {str(folder.id) for folder in existing}
            missing_folders = [
                Folder(
                    id=item["id"],
                    project_id=project_id,
                    parent_id=item.get("parent_id"),
                    kind="pasta",
                    name=item["name"].strip(),
                    created_by=user_id,
                    created_at=now,
                    updated_at=now,
                    size=int(item.get("size_bytes") or 0),
                )
                for item in source_folders
                if item.get("id") not in existing_ids and item.get("name", "").strip()
            ]
            logger.info(
                "folders_sync_stage project_id=%s stage=insert_missing_folders count=%d",
                project_id,
                len(missing_folders),
            )
            created = await self.repository.create_many(missing_folders) if missing_folders else []
            logger.info(
                "folders_sync_stage project_id=%s stage=missing_folders_inserted count=%d",
                project_id,
                len(created),
            )
            all_folders = [*existing, *created]
            integrity = {
                "total": len(all_folders),
                "invalid_parents": sum(
                    1
                    for folder in all_folders
                    if folder.parent_id
                    and str(folder.parent_id) not in {str(item.id) for item in all_folders}
                ),
                "invalid_kinds": sum(
                    1 for folder in all_folders if folder.kind not in {"pasta", "folder"}
                ),
            }
            return (
                all_folders,
                len(created),
                True,
                integrity,
                {
                    "source": source,
                    "updated": updated,
                },
            )

        to_create = [
            Folder(
                id=item.get("id") or str(uuid5(NAMESPACE_URL, f"{project_id}:{item['name']}")),
                project_id=project_id,
                parent_id=item.get("parent_id"),
                kind="pasta",
                name=item["name"].strip(),
                created_by=user_id,
                created_at=now,
                updated_at=now,
                size=int(item.get("size_bytes") or 0),
            )
            for item in source_folders
            if item.get("name", "").strip()
        ]
        if not to_create:
            logger.info("folders_sync_stage project_id=%s stage=no_folders_to_insert", project_id)
            return (
                [],
                0,
                False,
                {"total": 0, "invalid_parents": 0, "invalid_kinds": 0},
                {"source": source, "updated": 0},
            )
        logger.info(
            "folders_sync_stage project_id=%s stage=insert_initial_folders count=%d",
            project_id,
            len(to_create),
        )
        created = await self.repository.create_many(to_create)
        logger.info(
            "folders_sync_stage project_id=%s stage=initial_folders_inserted count=%d",
            project_id,
            len(created),
        )
        return (
            created,
            len(created),
            False,
            {"total": len(created), "invalid_parents": 0, "invalid_kinds": 0},
            {"source": source, "updated": 0},
        )

    async def _sync_legacy(
        self, project_id: str, user_id: str, request_id: str
    ) -> tuple[list[Folder], int, bool, dict, dict]:
        existing_ids = await self.repository.existing_ids(project_id)
        folders = self._read_all_folders(
            project_id, (await self.repository.find_project(project_id)).parent_folder, user_id
        )
        for folder in folders:
            folder.size = self._directory_size(
                str(
                    Path((await self.repository.find_project(project_id)).parent_folder)
                    / folder.name
                )
            )
        if existing_ids:
            saved = await self.repository.find_by_project(project_id)
            integrity = await self.repository.verify_project_folders(project_id)
            return saved, 0, True, integrity  # type: ignore[return-value]
        for index, folder in enumerate(folders, start=1):
            await self.repository.create_one(folder, request_id, index, len(folders))
        integrity = await self.repository.verify_project_folders(project_id)
        return folders, len(folders), False, integrity, {"request_id": request_id, "source": "rede"}

    @staticmethod
    def _read_all_folders(project_id: str, parent_folder: str, user_id: str) -> list[Folder]:
        root = Path(parent_folder)
        if not root.is_dir():
            return []
        now = datetime.now(UTC)
        folders: list[Folder] = []
        parent_ids: dict[str, str] = {str(root): None}  # type: ignore[dict-item]
        for current_path, directory_names, _ in os.walk(root):
            directory_names.sort(key=str.casefold)
            current_parent_id = parent_ids.get(current_path)
            for directory_name in directory_names:
                path = str(Path(current_path) / directory_name)
                folder_id = str(uuid5(NAMESPACE_URL, f"{project_id}:{path}"))
                parent_ids[path] = folder_id
                folders.append(
                    Folder(
                        id=folder_id,
                        project_id=project_id,
                        parent_id=current_parent_id,
                        kind="pasta",
                        name=directory_name,
                        created_by=user_id,
                        created_at=now,
                        updated_at=now,
                        size=0,
                    )
                )
        return folders

    async def can_list_project(self, project_id: str, user_id: str, role: str) -> bool:
        return await self.repository.can_view_project(project_id, user_id, role)

    async def project_exists(self, project_id: str) -> bool:
        return await self.repository.project_exists(project_id)

    async def resolve_created_by(self, identifiers: list[str]) -> str | None:
        return await self.repository.find_user_database_id(identifiers)

    async def sync_folder_acl(self, project_id: str) -> dict:
        """Lê a ACL real da pasta raiz e popula project_access_groups."""
        project = await self.repository.find_project(project_id)
        folder = (project.parent_folder if project else "").strip()
        if not folder:
            return {
                "folder": "",
                "groups": 0,
                "inserted": 0,
                "skipped": 0,
                "errors": ["Projeto sem pasta raiz cadastrada."],
            }

        from app.modules.projects.folder_access import sync_folder_acl

        settings = get_settings()
        resolver, warnings = DirectoryResolver.from_settings(settings)
        try:
            sync_result = sync_folder_acl(folder, project_id, resolver)
        finally:
            resolver.close()

        if sync_result.errors and not sync_result.inserted:
            return {
                "folder": folder,
                "groups": 0,
                "inserted": 0,
                "skipped": 0,
                "errors": sync_result.errors,
            }

        counters = await self.repository.upsert_access_groups(project_id, sync_result.inserted)
        logger.info(
            "folder_acl_sync project_id=%s folder=%s groups=%d inserted=%d skipped=%d errors=%d",
            project_id,
            folder,
            len(sync_result.inserted),
            counters["inserted"],
            counters.get("skipped", 0),
            len(sync_result.errors),
        )
        return {
            "folder": folder,
            "groups": len(sync_result.inserted),
            "inserted": counters["inserted"],
            "skipped": counters.get("skipped", 0),
            "errors": sync_result.errors,
            "warnings": warnings,
        }

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
