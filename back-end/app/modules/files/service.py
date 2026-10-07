import asyncio
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
        """Lista somente as pastas imediatamente dentro do caminho do projeto.

        A leitura do compartilhamento Windows acontece em uma thread para não
        bloquear o FastAPI. Se o caminho não estiver disponível, a tabela local
        continua sendo a fonte de fallback.
        """
        project = await self.repository.find_project(project_id)
        parent_folder = (project.parent_folder if project else "").strip()
        if not parent_folder:
            return await self.list_folders_by_project(project_id)

        try:
            folders = await asyncio.wait_for(
                asyncio.to_thread(self._read_root_folders, project_id, parent_folder),
                timeout=10,
            )
            return folders if folders else await self.list_folders_by_project(project_id)
        except Exception:
            # Compartilhamentos UNC podem falhar com exceções específicas do
            # Windows (ou permanecer indisponíveis sem gerar OSError). A API
            # deve continuar respondendo usando a tabela local como fallback.
            return await self.list_folders_by_project(project_id)

    @staticmethod
    def _read_root_folders(project_id: str, parent_folder: str) -> list[Folder]:
        root = Path(parent_folder)
        if not root.is_dir():
            return []

        now = datetime.now(UTC).replace(tzinfo=None)
        entries = sorted(
            (entry for entry in root.iterdir() if entry.is_dir()),
            key=lambda entry: entry.name.casefold(),
        )
        return [
            Folder(
                id=str(uuid5(NAMESPACE_URL, f"{project_id}:{entry}")),
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
