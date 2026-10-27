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

    async def read_live_project_folders(self, project_id: str) -> list[Folder] | None:
        project = await self.repository.find_project(project_id)
        parent_folder = (project.parent_folder if project else "").strip()
        if not parent_folder:
            return None
        try:
            return await asyncio.wait_for(
                asyncio.to_thread(self._read_root_folders, project_id, parent_folder),
                timeout=45,
            )
        except Exception:  # noqa: BLE001 - compartilhamentos podem falhar sem tipo estável
            return None

    async def list_project_folders_with_source(self, project_id: str) -> tuple[list[Folder], str]:
        """Exibe o cadastro local primeiro e consulta a rede apenas se estiver vazio."""
        stored_folders = await self.list_folders_by_project(project_id)
        if stored_folders:
            return stored_folders, "tabela"

        live_folders = await self.read_live_project_folders(project_id)
        return live_folders or [], "rede"

    async def list_project_folders(self, project_id: str) -> list[Folder]:
        folders, _source = await self.list_project_folders_with_source(project_id)
        return folders

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
                size=self._directory_size(entry.path),
            )
            for entry in entries
        ]

    @staticmethod
    def _directory_size(path: str) -> int:
        total = 0
        try:
            for current_path, _, file_names in os.walk(path):
                for file_name in file_names:
                    try:
                        total += os.stat(os.path.join(current_path, file_name), follow_symlinks=False).st_size
                    except OSError:
                        continue
        except OSError:
            return 0
        return total

    async def sync_project_folders(self, project_id: str, user_id: str, folders: list[dict] | str) -> tuple[list[Folder], int, bool, dict, dict]:
        project = await self.repository.find_project(project_id)
        parent_folder = (project.parent_folder if project else "").strip()
        if not parent_folder or not Path(parent_folder).is_dir():
            raise ValueError(f"A pasta raiz '{parent_folder}' não existe")

        if not hasattr(self.repository, "reconcile"):
            return await self._sync_legacy(project_id, user_id, str(folders))

        source = "rede"
        live_folders = await self.read_live_project_folders(project_id)
        if live_folders is not None:
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
            source = "tabela"
            source_folders = folders

        existing = await self.repository.find_by_project(project_id)
        now = datetime.now(UTC)
        if existing:
            updated = await self.repository.reconcile(existing, source_folders, now)
            return existing, 0, True, {"total": len(existing), "invalid_parents": 0, "invalid_kinds": 0}, {"source": source, "updated": updated}

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
            return [], 0, False, {"total": 0, "invalid_parents": 0, "invalid_kinds": 0}, {"source": source, "updated": 0}
        created = await self.repository.create_many(to_create)
        return created, len(created), False, {"total": len(created), "invalid_parents": 0, "invalid_kinds": 0}, {"source": source, "updated": 0}

    async def _sync_legacy(self, project_id: str, user_id: str, request_id: str) -> tuple[list[Folder], int, bool, dict, dict]:
        existing_ids = await self.repository.existing_ids(project_id)
        folders = self._read_all_folders(project_id, (await self.repository.find_project(project_id)).parent_folder, user_id)
        for folder in folders:
            folder.size = self._directory_size(str(Path((await self.repository.find_project(project_id)).parent_folder) / folder.name))
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
                folders.append(Folder(
                    id=folder_id,
                    project_id=project_id,
                    parent_id=current_parent_id,
                    kind="pasta",
                    name=directory_name,
                    created_by=user_id,
                    created_at=now,
                    updated_at=now,
                    size=0,
                ))
        return folders

    async def can_list_project(self, project_id: str, user_id: str, role: str) -> bool:
        return await self.repository.can_view_project(project_id, user_id, role)

    async def project_exists(self, project_id: str) -> bool:
        return await self.repository.project_exists(project_id)

    async def resolve_created_by(self, identifiers: list[str]) -> str | None:
        return await self.repository.find_user_database_id(identifiers)

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
