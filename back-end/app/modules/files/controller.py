from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import CurrentUser
from app.db.session import get_session
from app.modules.projects.models import Project
from app.modules.projects.repository import ProjectRepository

from .repository import FileRepository
from .schemas import FileListOut
from .service import FileService

router = APIRouter(prefix="/api/files", tags=["Files"])
Session = Annotated[AsyncSession, Depends(get_session)]


def get_service(session: Session) -> FileService:
    return FileService(FileRepository(session))


@router.get("", response_model=FileListOut)
async def list_files(
    service: Annotated[FileService, Depends(get_service)],
    user: CurrentUser,
    project_id: str = Query(alias="projectId"),
    parent_id: str | None = Query(default=None, alias="parentId"),
    all_folders: bool = Query(default=False, alias="allFolders"),
):
    project = await service.repository.session.get(Project, project_id)
    if not project:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    role = user["role"] or "participante"
    if not await ProjectRepository(service.repository.session).can_view(project_id, str(user["id"]), role):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Sem acesso a este projeto")
    files = await service.list_files(project_id, parent_id, all_folders)
    return {"files": files, "breadcrumb": []}


@router.get("/{file_id}", response_model=dict)
async def get_file(
    file_id: str,
    service: Annotated[FileService, Depends(get_service)],
    _: CurrentUser,
):
    from app.core.exceptions import NotFoundException

    file = await service.repository.find_by_id(file_id)
    if not file:
        raise NotFoundException("Arquivo não encontrado")
    return {"file": file}
