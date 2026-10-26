from pathlib import Path

import pytest

from app.modules.folders.service import FolderService


class FakeProject:
    def __init__(self, parent_folder: str):
        self.parent_folder = parent_folder


class FakeRepository:
    def __init__(self, parent_folder: str):
        self.project = FakeProject(parent_folder)
        self.saved = []
        self.committed_request_id = None

    async def existing_ids(self, project_id: str) -> set[str]:
        return {folder.id for folder in self.saved}

    async def find_project(self, project_id: str):
        return self.project

    async def create_one(self, folder, request_id, index, total):
        self.saved.append(folder)
        self.committed_request_id = request_id

    async def verify_project_folders(self, project_id: str):
        ids = {folder.id for folder in self.saved}
        return {
            "total": len(self.saved),
            "invalid_parents": sum(1 for folder in self.saved if folder.parent_id and folder.parent_id not in ids),
            "invalid_kinds": sum(1 for folder in self.saved if folder.kind not in {"pasta", "folder"}),
        }

    async def find_by_project(self, project_id: str):
        return self.saved


@pytest.mark.asyncio
async def test_sync_persists_tree_and_returns_integrity(tmp_path: Path):
    root = tmp_path / "root"
    child = root / "A" / "B"
    child.mkdir(parents=True)
    (root / "A" / "file.txt").write_bytes(b"1234")
    repository = FakeRepository(str(root))

    folders, inserted, existing, integrity, _trace = await FolderService(repository).sync_project_folders(
        "project-1", "user-1", "request-1"
    )

    assert inserted == 2
    assert existing is False
    assert len(folders) == integrity["total"] == 2
    assert integrity["invalid_parents"] == 0
    assert integrity["invalid_kinds"] == 0
    assert repository.committed_request_id == "request-1"
    assert any(folder.size == 4 for folder in folders)


@pytest.mark.asyncio
async def test_sync_is_idempotent_after_first_insert(tmp_path: Path):
    root = tmp_path / "root"
    (root / "A").mkdir(parents=True)
    repository = FakeRepository(str(root))
    service = FolderService(repository)

    await service.sync_project_folders("project-1", "user-1", "request-1")
    folders, inserted, existing, integrity = await service.sync_project_folders("project-1", "user-1", "request-2")

    assert len(folders) == 1
    assert inserted == 0
    assert existing is True
    assert integrity["total"] == 1


@pytest.mark.asyncio
async def test_sync_rejects_missing_parent_folder(tmp_path: Path):
    repository = FakeRepository(str(tmp_path / "does-not-exist"))

    with pytest.raises(ValueError, match="não existe"):
        await FolderService(repository).sync_project_folders("project-1", "user-1", "request-1")
