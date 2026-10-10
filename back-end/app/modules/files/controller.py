from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import CurrentUser
from app.db.session import get_session

from .repository import FolderRepository
from .schemas import FolderListOut, FolderSyncOut
from .service import FolderService

router = APIRouter(prefix="/api/folders", tags=["Folders"])
Session = Annotated[AsyncSession, Depends(get_session)]


def get_service(session: Session) -> FolderService:
    return FolderService(FolderRepository(session))


@router.post("/sync", response_model=FolderSyncOut)
async def synchronize_folders(
    service: Annotated[FolderService, Depends(get_service)],
    user: CurrentUser,
    project_id: str = Query(alias="projectId"),
):
    from fastapi import HTTPException
    if not await service.project_exists(project_id):
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    role = user["role"] or "solicitante"
    if not await service.can_list_project(project_id, str(user["id"]), role):
        raise HTTPException(status_code=403, detail="Sem acesso a este projeto")
    try:
        return await service.synchronize_project_folders(project_id, str(user["id"]))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except (FileNotFoundError, TimeoutError):
        raise HTTPException(status_code=503, detail="A área de rede não está disponível para sincronização")


@router.get("", response_model=FolderListOut)
async def list_folders(
    service: Annotated[FolderService, Depends(get_service)],
    user: CurrentUser,
    project_id: str = Query(alias="projectId"),
):
    from fastapi import HTTPException
    if not await service.project_exists(project_id):
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    role = user["role"] or "solicitante"
    if not await service.can_list_project(project_id, str(user["id"]), role):
        raise HTTPException(status_code=403, detail="Sem acesso a este projeto")
    return {"folders": await service.list_project_folders(project_id)}
