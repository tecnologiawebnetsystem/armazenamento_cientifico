import json
import logging
import subprocess
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import CurrentUser
from app.db.session import get_session

from .repository import FolderRepository
from .schemas import FolderListOut, FolderPermissionsOut, FolderSyncOut
from .service import FolderService

logger = logging.getLogger(__name__)
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
        logger.warning("folder_sync_project_not_found project_id=%s", project_id)
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    role = user["role"] or "solicitante"
    if not await service.can_list_project(project_id, str(user["id"]), role):
        logger.warning("folder_sync_forbidden project_id=%s user_id=%s role=%s", project_id, user["id"], role)
        raise HTTPException(status_code=403, detail="Sem acesso a este projeto")
    logger.info("folder_sync_authorized project_id=%s user_id=%s role=%s", project_id, user["id"], role)
    try:
        return await service.synchronize_project_folders(project_id, str(user["id"]))
    except ValueError as exc:
        logger.warning("folder_sync_validation_failed project_id=%s detail=%s", project_id, exc, exc_info=True)
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        logger.warning("folder_sync_path_not_found project_id=%s detail=%s", project_id, exc, exc_info=True)
        raise HTTPException(
            status_code=503,
            detail="A área de rede não foi encontrada ou está desconectada. Verifique o caminho e tente novamente.",
        ) from exc
    except PermissionError as exc:
        logger.warning("folder_sync_permission_failed project_id=%s detail=%s", project_id, exc, exc_info=True)
        raise HTTPException(
            status_code=503,
            detail="A área de rede foi encontrada, mas o servidor não tem permissão para ler uma ou mais pastas.",
        ) from exc
    except TimeoutError as exc:
        logger.error("folder_sync_timeout project_id=%s detail=%s", project_id, exc, exc_info=True)
        raise HTTPException(
            status_code=504,
            detail="A leitura da área de rede demorou mais que o permitido. Tente novamente quando houver menos movimentação na rede.",
        ) from exc
    except OSError as exc:
        logger.error("folder_sync_os_error project_id=%s detail=%s", project_id, exc, exc_info=True)
        raise HTTPException(
            status_code=503,
            detail="Não foi possível ler a área de rede. Confirme a conexão e as permissões de acesso.",
        ) from exc
    except Exception as exc:
        logger.exception("folder_sync_failed project_id=%s", project_id)
        raise HTTPException(
            status_code=500,
            detail="A sincronização encontrou um erro interno. Tente novamente; se persistir, consulte os logs do servidor.",
        ) from exc


@router.get("/{folder_id}/permissions", response_model=FolderPermissionsOut)
async def get_folder_permissions(
    folder_id: str,
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
        return await service.get_folder_permissions(project_id, folder_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (OSError, subprocess.SubprocessError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=503, detail="Não foi possível consultar as permissões da pasta") from exc


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
