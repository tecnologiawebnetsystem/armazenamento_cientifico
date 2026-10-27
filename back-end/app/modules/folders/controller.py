import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import CurrentUser
from app.db.session import get_session

from .repository import FolderRepository
from .schemas import FolderListOut, FolderSyncIn
from .service import FolderService

router = APIRouter(prefix="/api/folders", tags=["Folders"])
logger = logging.getLogger(__name__)
Session = Annotated[AsyncSession, Depends(get_session)]


def get_service(session: Session) -> FolderService:
    return FolderService(FolderRepository(session))


@router.post("/sync", response_model=FolderListOut)
async def sync_folders(
    service: Annotated[FolderService, Depends(get_service)],
    user: CurrentUser,
    project_id: str = Query(alias="projectId"),
    payload: FolderSyncIn | None = None,
):
    from fastapi import HTTPException
    if not await service.project_exists(project_id):
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    role = user["role"] or "solicitante"
    if not await service.can_list_project(project_id, str(user["id"]), role):
        raise HTTPException(status_code=403, detail="Sem acesso a este projeto")
    # folders.created_by referencia users.id, não o ID da sessão HTTP.
    created_by = user.get("db_user_id")
    if not created_by:
        profile_data = user.get("profile_data") or {}
        identifiers = [
            str(value)
            for value in (
                user.get("user_id"),
                user.get("cav4_user_id"),
                user.get("subject"),
                profile_data.get("user_login"),
                profile_data.get("cav4_user_id"),
            )
            if value
        ]
        created_by = await service.resolve_created_by(identifiers)
    if not created_by:
        raise HTTPException(status_code=401, detail="Usuário autenticado não encontrado no cadastro local")
    try:
        folders, inserted, existing, integrity, trace = await service.sync_project_folders(
            project_id,
            str(created_by),
            [item.model_dump() for item in (payload.folders if payload else [])],
        )
        source = trace.get("source", "tabela")
        updated = trace.get("updated", 0)
        logger.info("folders_sync_success project_id=%s source=%s inserted=%s updated=%s total=%s", project_id, source, inserted, updated, len(folders))
        return {"folders": folders, "inserted": inserted, "updated": updated, "existing": existing, "integrity": integrity, "trace": trace, "source": source}
    except Exception:
        logger.exception("folders_sync_failed project_id=%s", project_id)
        raise


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
    try:
        folders, source = await service.list_project_folders_with_source(project_id)
        logger.info("folders_list_success project_id=%s source=%s total=%s", project_id, source, len(folders))
    except Exception:  # noqa: BLE001 - qualquer falha da rede deve usar a cópia local
        folders = await service.list_folders_by_project(project_id)
        source = "tabela-fallback"
        logger.exception("folders_list_fallback project_id=%s source=%s total=%s", project_id, source, len(folders))
    return {"folders": folders, "source": source}
