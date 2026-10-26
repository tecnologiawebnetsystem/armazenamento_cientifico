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
            return await self.list_folders_by_project(project_id)

        try:
            folders = await asyncio.wait_for(
                asyncio.to_thread(self._read_root_folders, project_id, parent_folder),
                timeout=45,
            )
            return folders if folders else await self.list_folders_by_project(project_id)
        except Exception:  # noqa: BLE001 - UNC pode lançar exceções do Windows sem tipo documentado
            # Compartilhamentos UNC podem falhar com exceções específicas do
            # Windows (ou permanecer indisponíveis sem gerar OSError). A API
            # deve continuar respondendo usando a tabela local como fallback.
            return await self.list_folders_by_project(project_id)

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

    async def sync_project_folders(self, project_id: str, created_by: str) -> tuple[list[Folder], int, bool]:
        if await self.repository.has_project_folders(project_id):
            return await self.repository.find_by_project(project_id), 0, True
        project = await self.repository.find_project(project_id)
        parent_folder = (getattr(project, "parent_folder", None) or "").strip()
        if not parent_folder:
            raise ValueError("A área de rede não possui uma pasta-mãe configurada")
        root = Path(parent_folder)
        if not root.is_dir():
            raise ValueError("A pasta-mãe não existe ou não está acessível")

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
            parent_path = str(current_path.parent)
            size = 0
            try:
                for file_path in current_path.rglob("*"):
                    if file_path.is_file() and not file_path.is_symlink():
                        try:
                            size += file_path.stat().st_size
                        except OSError:
                            continue
            except OSError:
                pass
            discovered.append(Folder(id=folder_id, project_id=project_id,
                parent_id=ids_by_path.get(parent_path), kind="pasta", name=current_path.name,
                created_by=created_by, created_at=now, updated_at=now, size=size))
        await self.repository.create_many(discovered)
        return discovered, len(discovered), False

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
