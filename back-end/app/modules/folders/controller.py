import logging
from time import perf_counter
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import CurrentUser
from app.db.session import get_session

from .repository import FolderRepository
from .schemas import FolderListOut, FolderSyncIn, FolderSyncOut
from .service import FolderService, FolderSourceUnavailable

router = APIRouter(prefix="/api/folders", tags=["Folders"])
logger = logging.getLogger(__name__)
Session = Annotated[AsyncSession, Depends(get_session)]


def get_service(session: Session) -> FolderService:
    return FolderService(FolderRepository(session))


@router.post("/sync", response_model=FolderSyncOut)
async def sync_folders(
    service: Annotated[FolderService, Depends(get_service)],
    user: CurrentUser,
    project_id: str = Query(alias="projectId"),
    scope: Literal["all", "folders", "groups"] = Query(default="all"),
    payload: FolderSyncIn | None = None,
):
    if not await service.project_exists(project_id):
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    role = user["role"] or "solicitante"
    if not await service.can_list_project(project_id, str(user["id"]), role):
        raise HTTPException(status_code=403, detail="Sem acesso a este projeto")
    started_at = perf_counter()
    stage = "prepare_sync"
    logger.info("folders_sync_started project_id=%s scope=%s", project_id, scope)
    try:
        if scope == "groups":
            stage = "skip_folder_scan"
            folders = []
            inserted = 0
            existing = False
            integrity = {"total": 0, "invalid_parents": 0, "invalid_kinds": 0}
            trace = {"source": "rede", "updated": 0}
        else:
            stage = "resolve_created_by"
            logger.info(
                "folders_sync_stage project_id=%s scope=%s stage=%s",
                project_id,
                scope,
                stage,
            )
            # folders.created_by referencia users.id, não o ID da sessão HTTP.
            created_by = user.get("user_id")
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
                raise HTTPException(
                    status_code=401, detail="Usuário autenticado não encontrado no cadastro local"
                )
            stage = "sync_network_folders"
            logger.info(
                "folders_sync_stage project_id=%s scope=%s stage=%s",
                project_id,
                scope,
                stage,
            )
            folders, inserted, existing, integrity, trace = await service.sync_project_folders(
                project_id,
                str(created_by),
                [item.model_dump() for item in (payload.folders if payload else [])],
            )

        source = trace.get("source", "tabela")
        updated = trace.get("updated", 0)

        # Sincroniza a ACL da pasta raiz com project_access_groups.
        acl_sync: dict | None = None
        if scope in {"all", "groups"}:
            stage = "sync_folder_acl"
            logger.info(
                "folders_sync_stage project_id=%s scope=%s stage=%s",
                project_id,
                scope,
                stage,
            )
            try:
                acl_sync = await service.sync_folder_acl(project_id)
            except Exception:
                logger.exception("folder_acl_sync_failed project_id=%s", project_id)

        acl_result = acl_sync or {}
        if scope != "groups" and not folders:
            logger.warning(
                "folders_sync_completed_empty project_id=%s source=%s", project_id, source
            )
        stage = "response_ready"
        duration_ms = (perf_counter() - started_at) * 1000
        logger.info(
            "folders_sync_success project_id=%s scope=%s source=%s inserted=%s updated=%s folders=%s acl_groups=%s acl_inserted=%s acl_errors=%s duration_ms=%.2f",
            project_id,
            scope,
            source,
            inserted,
            updated,
            len(folders),
            acl_result.get("groups", 0),
            acl_result.get("inserted", 0),
            len(acl_result.get("errors", [])),
            duration_ms,
        )
        return {
            "folders": folders,
            "inserted": inserted,
            "updated": updated,
            "existing": existing,
            "integrity": integrity,
            "trace": trace,
            "source": source,
            "acl": acl_sync,
        }
    except HTTPException as error:
        logger.warning(
            "folders_sync_rejected project_id=%s scope=%s stage=%s status_code=%s duration_ms=%.2f",
            project_id,
            scope,
            stage,
            error.status_code,
            (perf_counter() - started_at) * 1000,
        )
        raise
    except FolderSourceUnavailable as error:
        logger.exception(
            "folders_sync_network_failed project_id=%s scope=%s stage=%s error_type=%s duration_ms=%.2f",
            project_id,
            scope,
            stage,
            type(error).__name__,
            (perf_counter() - started_at) * 1000,
        )
        raise HTTPException(status_code=502, detail=str(error)) from error
    except Exception as error:
        logger.exception(
            "folders_sync_failed project_id=%s scope=%s stage=%s error_type=%s duration_ms=%.2f",
            project_id,
            scope,
            stage,
            type(error).__name__,
            (perf_counter() - started_at) * 1000,
        )
        raise


@router.get("", response_model=FolderListOut)
async def list_folders(
    service: Annotated[FolderService, Depends(get_service)],
    user: CurrentUser,
    project_id: str = Query(alias="projectId"),
):
    if not await service.project_exists(project_id):
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    role = user["role"] or "solicitante"
    if not await service.can_list_project(project_id, str(user.get("user_id") or user["id"]), role):
        raise HTTPException(status_code=403, detail="Sem acesso a este projeto")
    try:
        folders, source = await service.list_project_folders_with_source(project_id)
        logger.info(
            "folders_list_success project_id=%s source=%s total=%s",
            project_id,
            source,
            len(folders),
        )
    except Exception:
        folders = await service.list_folders_by_project(project_id)
        source = "tabela-fallback"
        logger.exception(
            "folders_list_fallback project_id=%s source=%s total=%s",
            project_id,
            source,
            len(folders),
        )
    return {"folders": folders, "source": source}
