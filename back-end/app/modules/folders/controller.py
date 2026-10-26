import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import CurrentUser
from app.db.session import get_session

from .repository import FolderRepository
from .schemas import FolderListOut, FolderSyncOut
from .service import FolderService

logger = logging.getLogger(__name__)
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
    from fastapi import HTTPException
    if not await service.project_exists(project_id):
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    role = user["role"] or "solicitante"
    if not await service.can_list_project(project_id, str(user["id"]), role):
        raise HTTPException(status_code=403, detail="Sem acesso a este projeto")
    return {"folders": await service.list_project_folders(project_id)}


@router.post("/sync", response_model=FolderSyncOut)
async def sync_folders(
    service: Annotated[FolderService, Depends(get_service)],
    user: CurrentUser,
    project_id: str = Query(alias="projectId"),
):
    if not await service.project_exists(project_id):
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    role = user["role"] or "solicitante"
    if not await service.can_list_project(project_id, str(user["id"]), role):
        raise HTTPException(status_code=403, detail="Sem acesso a este projeto")
    try:
        folders, inserted, existing = await service.sync_project_folders(project_id, str(user["id"]))
    except ValueError as error:
        logger.warning("[folders] sync_validation_error project_id=%s error=%s", project_id, error)
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        logger.exception("[folders] sync_unexpected_error project_id=%s", project_id)
        raise HTTPException(status_code=500, detail=f"Falha ao atualizar a área de rede: {type(error).__name__}") from error
    return {"folders": folders, "inserted": inserted, "existing": existing,
            "message": "A estrutura já estava cadastrada" if existing else f"{inserted} pastas cadastradas"}
