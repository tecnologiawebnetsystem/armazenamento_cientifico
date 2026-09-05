from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import CurrentUser, require_roles
from app.db.session import get_session

from .permissions_model import FilePermission
from .repository import FileRepository
from .schemas import FileCreate, FileListOut, FilePermissionCreate, FilePermissionOut, FileUpdate
from .service import FileService

router = APIRouter(prefix="/api/files", tags=["Files"])
Session = Annotated[AsyncSession, Depends(get_session)]


def get_service(session: Session) -> FileService:
    return FileService(FileRepository(session))


@router.get("", response_model=FileListOut)
async def list_files(
    service: Annotated[FileService, Depends(get_service)],
    _: CurrentUser,
    project_id: str = Query(alias="projectId"),
    parent_id: str | None = Query(default=None, alias="parentId"),
    all_folders: bool = Query(default=False, alias="allFolders"),
):
    files = await service.list_files(project_id, parent_id, all_folders)
    return {"files": files, "breadcrumb": []}


@router.post("", response_model=dict, status_code=201)
async def create_file(
    data: FileCreate,
    service: Annotated[FileService, Depends(get_service)],
    _: Annotated[dict, Depends(require_roles("admin"))],
):
    file = await service.create_file(data, "system")
    return {"file": file}


@router.post("/{file_id}/permissions", response_model=FilePermissionOut, status_code=201)
async def create_file_permission(
    file_id: str,
    data: FilePermissionCreate,
    session: Session,
    _: Annotated[dict, Depends(require_roles("admin"))],
):
    if not data.user_id and not data.group_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="Informe user_id ou group_id")
    permission = FilePermission(
        file_id=file_id,
        user_id=data.user_id,
        group_id=data.group_id,
        level=data.level,
        created_at=datetime.now(UTC),
    )
    session.add(permission)
    await session.commit()
    await session.refresh(permission)
    return permission


@router.get("/{file_id}/permissions", response_model=list[FilePermissionOut])
async def list_file_permissions(
    file_id: str,
    session: Session,
    _: CurrentUser,
):
    result = await session.scalars(
        select(FilePermission)
        .where(FilePermission.file_id == file_id)
        .order_by(FilePermission.level, FilePermission.user_id, FilePermission.group_id)
    )
    return list(result)


@router.delete("/{file_id}/permissions", status_code=204)
async def delete_file_permission(
    file_id: str,
    session: Session,
    _: Annotated[dict, Depends(require_roles("admin"))],
    user_id: str | None = None,
    group_id: str | None = None,
):
    if not user_id and not group_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="Informe user_id ou group_id")
    statement = select(FilePermission).where(FilePermission.file_id == file_id)
    if user_id:
        statement = statement.where(FilePermission.user_id == user_id)
    if group_id:
        statement = statement.where(FilePermission.group_id == group_id)
    permission = await session.scalar(statement)
    if permission:
        await session.delete(permission)
        await session.commit()


@router.get("/{file_id}", response_model=dict)
async def get_file(
    file_id: str,
    service: Annotated[FileService, Depends(get_service)],
):
    from app.core.exceptions import NotFoundException

    file = await service.repository.find_by_id(file_id)
    if not file:
        raise NotFoundException("Arquivo não encontrado")
    return {"file": file}


@router.patch("/{file_id}", response_model=dict)
async def update_file(
    file_id: str,
    data: FileUpdate,
    service: Annotated[FileService, Depends(get_service)],
    _: Annotated[dict, Depends(require_roles("admin"))],
):
    return {"file": await service.update_file(file_id, data)}


@router.delete("/{file_id}", status_code=204)
async def delete_file(
    file_id: str,
    service: Annotated[FileService, Depends(get_service)],
    _: Annotated[dict, Depends(require_roles("admin"))],
):
    await service.delete_file(file_id)
