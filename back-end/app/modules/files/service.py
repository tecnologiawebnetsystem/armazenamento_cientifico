import asyncio
import os
from datetime import UTC, datetime
from pathlib import Path
from uuid import NAMESPACE_URL, uuid4, uuid5

from app.modules.files.models import Folder
from app.modules.files.repository import FolderRepository
from app.modules.files.schemas import FolderCreate


class FolderService:
    def __init__(self, repository: FolderRepository):
        self.repository = repository

    async def get_folder(self, folder_id: str) -> Folder | None:
        return await self.repository.find_by_id(folder_id)

    async def list_folders_by_project(self, project_id: str) -> list[Folder]:
        return await self.repository.find_by_project(project_id)

    async def list_project_folders(self, project_id: str) -> list[Folder]:
        """Consulta rápida: a tabela local é a fonte da aba de Pastas."""
        return await self.list_folders_by_project(project_id)

    async def synchronize_project_folders(self, project_id: str, user_id: str) -> dict:
        project = await self.repository.find_project(project_id)
        parent_folder = (project.parent_folder if project else "").strip()
        if not parent_folder:
            raise ValueError("O projeto não possui área de rede configurada")

        discovered = await asyncio.wait_for(
            asyncio.to_thread(self._discover_folders, project_id, parent_folder, user_id),
            timeout=120,
        )
        current = await self.repository.find_by_project(project_id)
        current_by_id = {folder.id: folder for folder in current}
        desired_ids = {folder.id for folder in discovered}
        added = 0
        updated = 0
        now = datetime.now(UTC).replace(tzinfo=None)

        for folder in discovered:
            existing = current_by_id.get(folder.id)
            if existing is None:
                added += 1
                continue
            if existing.name != folder.name or existing.parent_id != folder.parent_id:
                existing.name = folder.name
                existing.parent_id = folder.parent_id
                existing.updated_at = now
                updated += 1

        stale_ids = [folder.id for folder in current if folder.id not in desired_ids]
        await self.repository.save_sync([folder for folder in discovered if folder.id not in current_by_id], stale_ids)
        folders = await self.repository.find_by_project(project_id)
        return {"folders": folders, "added": added, "updated": updated, "removed": len(stale_ids), "synchronized_at": now}

    @staticmethod
    def _discover_folders(project_id: str, parent_folder: str, user_id: str) -> list[Folder]:
        root = Path(parent_folder)
        if not root.is_dir():
            raise FileNotFoundError(f"Área de rede indisponível: {parent_folder}")
        now = datetime.now(UTC).replace(tzinfo=None)
        discovered: list[Folder] = []
        paths = sorted((path for path in root.rglob("*") if path.is_dir()), key=lambda path: str(path).casefold())
        ids_by_path: dict[Path, str] = {}
        for path in paths:
            folder_id = str(uuid5(NAMESPACE_URL, f"{project_id}:{path}"))
            ids_by_path[path] = folder_id
            parent = path.parent if path.parent != root else None
            discovered.append(Folder(id=folder_id, project_id=project_id, parent_id=ids_by_path.get(parent), kind="pasta", name=path.name, created_by=user_id, created_at=now, updated_at=now, size=0))
        return discovered

    async def can_list_project(self, project_id: str, user_id: str, role: str) -> bool:
        return await self.repository.can_view_project(project_id, user_id, role)

    async def project_exists(self, project_id: str) -> bool:
        return await self.repository.project_exists(project_id)

    async def list_subfolders(self, parent_id: str) -> list[Folder]:
        return await self.repository.list_by_parent(parent_id)

    async def create_folder(self, data: FolderCreate) -> Folder:
        now = datetime.now(UTC).replace(tzinfo=None)
        folder = Folder(
            id=str(uuid4()),
            name=data.name,
            project_id=data.project_id,
            parent_id=data.parent_id,
            kind=data.kind,
            mime_type=data.mime_type,
            created_by=data.created_by,
            created_at=now,
            updated_at=now,
            size=0,
        )
        return await self.repository.create(folder)

    async def delete_folder(self, folder_id: str) -> bool:
        return await self.repository.delete(folder_id)
