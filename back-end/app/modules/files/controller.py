from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import CurrentUser
from app.db.session import get_session
from app.modules.projects.models import Project
from app.modules.projects.repository import ProjectRepository

from .repository import FolderRepository
from .schemas import FolderListOut
from .service import FolderService

router = APIRouter(prefix="/api/folders", tags=["Folders"])
Session = Annotated[AsyncSession, Depends(get_session)]


def get_service(session: Session) -> FolderService:
    return FolderService(FolderRepository(session))


@router.get("", response_model=FolderListOut)
async def list_folders(
    service: Annotated[FolderService, Depends(get_service)],
    user: CurrentUser,
    project_id: str = Query(alias="projectId"),
):
    project = await service.repository.session.get(Project, project_id)
    if not project:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    role = user["role"] or "participante"
    if not await ProjectRepository(service.repository.session).can_view(project_id, str(user["id"]), role):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Sem acesso a este projeto")
    return {"folders": await service.list_folders(project_id)}
