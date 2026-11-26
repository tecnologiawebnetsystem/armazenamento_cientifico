import logging
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.dialects import postgresql

from app.modules.folders.controller import sync_folders
from app.modules.folders.repository import FolderRepository
from app.modules.folders.service import FolderService, FolderSourceUnavailable


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
            "invalid_parents": sum(
                1 for folder in self.saved if folder.parent_id and folder.parent_id not in ids
            ),
            "invalid_kinds": sum(
                1 for folder in self.saved if folder.kind not in {"pasta", "folder"}
            ),
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

    folders, inserted, existing, integrity, _trace = await FolderService(
        repository
    ).sync_project_folders("project-1", "user-1", "request-1")

    assert inserted == 1
    assert existing is False
    assert len(folders) == integrity["total"] == 1
    assert {folder.name for folder in folders} == {"A"}
    assert integrity["invalid_parents"] == 0
    assert integrity["invalid_kinds"] == 0
    assert repository.committed_request_id == "request-1"
    assert all(folder.size == 0 for folder in folders)


@pytest.mark.asyncio
async def test_sync_is_idempotent_after_first_insert(tmp_path: Path):
    root = tmp_path / "root"
    (root / "A").mkdir(parents=True)
    repository = FakeRepository(str(root))
    service = FolderService(repository)

    await service.sync_project_folders("project-1", "user-1", "request-1")
    folders, inserted, existing, integrity = await service.sync_project_folders(
        "project-1", "user-1", "request-2"
    )

    assert len(folders) == 1
    assert inserted == 0
    assert existing is True
    assert integrity["total"] == 1


@pytest.mark.asyncio
async def test_sync_rejects_missing_parent_folder(tmp_path: Path):
    repository = FakeRepository(str(tmp_path / "does-not-exist"))

    with pytest.raises(FolderSourceUnavailable, match="não existe ou não está acessível"):
        await FolderService(repository).sync_project_folders("project-1", "user-1", "request-1")


class ReconcileRepository(FakeRepository):
    async def reconcile(self, _folders, _source_folders, _updated_at):
        return len(_folders)

    async def create_many(self, folders):
        self.saved.extend(folders)
        return folders


@pytest.mark.asyncio
async def test_sync_adds_new_nested_folders_when_project_already_has_folders(tmp_path: Path):
    root = tmp_path / "root"
    (root / "Área existente").mkdir(parents=True)
    (root / "Área nova" / "Subárea nova").mkdir(parents=True)
    scanned = FolderService._read_root_folders("project-1", str(root))
    repository = ReconcileRepository(str(root))
    repository.saved = [next(folder for folder in scanned if folder.name == "Área existente")]

    folders, inserted, existing, integrity, trace = await FolderService(
        repository
    ).sync_project_folders("project-1", "user-1", [])

    assert existing is True
    assert inserted == 1
    assert {folder.name for folder in folders} == {"Área existente", "Área nova"}
    assert integrity["total"] == 2
    assert integrity["invalid_parents"] == 0
    assert trace["updated"] == 1


@pytest.mark.asyncio
async def test_acl_link_uses_persisted_group_id_on_identifier_conflict():
    upsert_result = SimpleNamespace(rowcount=1, scalar_one_or_none=lambda: "persisted-group-id")
    session = SimpleNamespace(
        execute=AsyncMock(side_effect=[upsert_result, None]),
        commit=AsyncMock(),
        scalar=AsyncMock(),
    )

    await FolderRepository(session).upsert_access_groups(
        "project-1",
        [
            {
                "group_id": "new-random-group-id",
                "identifier": "S-1-5-21-123-456-789-1001",
                "group_name": "Grupo AD",
                "principal_type": "group",
                "access_level": "leitura",
                "source": "rede",
            }
        ],
    )

    link_statement = session.execute.await_args_list[1].args[0]
    assert (
        link_statement.compile(dialect=postgresql.dialect()).params["group_id"]
        == "persisted-group-id"
    )
    session.commit.assert_awaited_once()


class ListingRepository:
    def __init__(self, folders, project_root):
        self.folders = folders
        self.project = FakeProject(str(project_root))

    async def find_project(self, project_id):
        return self.project

    async def find_by_project(self, project_id):
        return self.folders


@pytest.mark.asyncio
async def test_listing_prefers_database_folders(tmp_path: Path):
    stored = [object()]
    service = FolderService(ListingRepository(stored, tmp_path))

    folders, source = await service.list_project_folders_with_source("project-1")

    assert folders is stored
    assert source == "tabela"


@pytest.mark.asyncio
async def test_listing_does_not_scan_network_when_database_is_empty(tmp_path: Path, monkeypatch):
    service = FolderService(ListingRepository([], tmp_path))

    async def fail_if_network_is_scanned(_project_id: str):
        raise AssertionError("a listagem não deve varrer a rede")

    monkeypatch.setattr(service, "read_live_project_folders", fail_if_network_is_scanned)

    folders, source = await service.list_project_folders_with_source("project-1")

    assert folders == []
    assert source == "tabela"


def test_live_folder_scan_returns_only_direct_subfolders(
    tmp_path: Path, caplog: pytest.LogCaptureFixture
):
    root = tmp_path / "root"
    nested = root / "Área A" / "Subárea B"
    nested.mkdir(parents=True)
    (root / "Área A" / "documento.txt").write_bytes(b"1234")

    with caplog.at_level(logging.INFO):
        folders = FolderService._read_root_folders("project-1", str(root))

    assert [folder.name for folder in folders] == ["Área A"]
    assert folders[0].parent_id is None
    assert folders[0].size == 0
    assert "folders_network_subfolder_found project_id=project-1 relative_path='Área A'" in caplog.text
    assert "Área A/Subárea B" not in caplog.text


@pytest.mark.asyncio
async def test_live_folder_scan_logs_and_raises_on_network_error(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
):
    service = FolderService(ListingRepository([], tmp_path))

    def fail_scan(_project_id: str, _parent_folder: str):
        raise PermissionError("Acesso negado à pasta de rede")

    monkeypatch.setattr(FolderService, "_read_root_folders", staticmethod(fail_scan))

    with pytest.raises(FolderSourceUnavailable, match="Não foi possível listar"):
        await service.read_live_project_folders("project-1")

    assert "folders_network_scan_failed" in caplog.text
    assert str(tmp_path) in caplog.text


@pytest.mark.asyncio
async def test_folder_sync_failure_logs_stage_and_traceback(caplog: pytest.LogCaptureFixture):
    service = SimpleNamespace(
        project_exists=AsyncMock(return_value=True),
        can_list_project=AsyncMock(return_value=True),
        resolve_created_by=AsyncMock(return_value="user-1"),
        sync_project_folders=AsyncMock(side_effect=RuntimeError("repository unavailable")),
    )
    user = {"id": "session-id", "user_id": "user-1", "role": "admin"}

    with (
        caplog.at_level(logging.ERROR),
        pytest.raises(RuntimeError, match="repository unavailable"),
    ):
        await sync_folders(
            service=service,
            user=user,
            project_id="project-1",
            scope="folders",
            payload=None,
        )

    service.resolve_created_by.assert_awaited_once_with(["user-1", "session-id"])
    assert "folders_sync_failed" in caplog.text
    assert "stage=sync_network_folders" in caplog.text
    assert "scope=folders" in caplog.text
    assert "RuntimeError: repository unavailable" in caplog.text


@pytest.mark.asyncio
async def test_sync_does_not_use_stale_submitted_folders_when_network_fails(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
):
    class ReconcileRepository(FakeRepository):
        async def reconcile(self, *_args, **_kwargs):
            raise AssertionError("não deve reconciliar dados enviados anteriormente")

    service = FolderService(ReconcileRepository(str(tmp_path)))

    async def fail_network(_project_id: str):
        raise FolderSourceUnavailable("Falha de leitura da rede")

    monkeypatch.setattr(service, "read_live_project_folders", fail_network)

    with pytest.raises(FolderSourceUnavailable, match="Falha de leitura da rede"):
        await service.sync_project_folders(
            "project-1",
            "user-1",
            [{"name": "dados antigos"}],
        )
