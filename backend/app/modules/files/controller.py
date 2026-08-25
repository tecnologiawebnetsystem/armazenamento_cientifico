from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session

from .repository import FileRepository
from .schemas import FileCreate, FileListOut, FileUpdate
from .service import FileService

router = APIRouter(prefix="/api/files", tags=["Files"])
Session = Annotated[AsyncSession, Depends(get_session)]


def get_service(session: Session) -> FileService:
    return FileService(FileRepository(session))


@router.get("", response_model=FileListOut)
async def list_files(project_id: str = Query(alias="projectId"), parent_id: str | None = Query(default=None, alias="parentId"), all_folders: bool = Query(default=False, alias="allFolders"), service: FileService = Depends(get_service)):
    files = await service.list_files(project_id, parent_id, all_folders)
    return {"files": files, "breadcrumb": []}


@router.post("", response_model=dict, status_code=201)
async def create_file(data: FileCreate, service: FileService = Depends(get_service)):
    file = await service.create_file(data, "system")
    return {"file": file}


@router.get("/{file_id}", response_model=dict)
async def get_file(file_id: str, service: FileService = Depends(get_service)):
    from app.core.exceptions import NotFoundException
    file = await service.repository.find_by_id(file_id)
    if not file:
        raise NotFoundException("Arquivo não encontrado")
    return {"file": file}


@router.patch("/{file_id}", response_model=dict)
async def update_file(file_id: str, data: FileUpdate, service: FileService = Depends(get_service)):
    return {"file": await service.update_file(file_id, data)}


@router.delete("/{file_id}", status_code=204)
async def delete_file(file_id: str, service: FileService = Depends(get_service)):
    await service.delete_file(file_id)
