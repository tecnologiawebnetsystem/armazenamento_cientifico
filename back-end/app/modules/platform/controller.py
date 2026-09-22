import csv
import io
import logging
from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import CurrentUser
from app.db.session import get_session

from .repository import PlatformRepository
from .service import PlatformService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Platform"])


def service_dependency(session: Annotated[AsyncSession, Depends(get_session)]) -> PlatformService:
    return PlatformService(PlatformRepository(session))


Service = Annotated[PlatformService, Depends(service_dependency)]
ConfigurationPayload = Annotated[dict[str, Any], Body()]


@router.get("/platform/context")
async def platform_context(service: Service, user: CurrentUser):
    logger.info("platform_context_read profile_id=%s email=%s", user.get("profile_id"), user.get("email"))
    return await service.context(user)


@router.get("/catalogos")
async def catalogs(service: Service, _: CurrentUser):
    logger.info("platform_catalogs_read")
    return await service.catalogs()


CONFIGURATION_RESOURCES = frozenset(PlatformRepository.CONFIGURATION_TABLES)


def require_admin(user: dict[str, Any]) -> None:
    profile_id = str(user.get("profile_id", ""))
    profile_name = str(user.get("profile_name", ""))
    if profile_id.upper() != "ADM" and "admin" not in profile_name.lower():
        raise HTTPException(status_code=403, detail="Apenas administradores podem alterar configurações")


@router.get("/configurations/{resource}")
async def configurations(resource: str, service: Service, user: CurrentUser):
    if resource not in CONFIGURATION_RESOURCES: raise HTTPException(status_code=404, detail="Recurso de configuração inválido")
    require_admin(user)
    return await service.configurations(resource)


@router.post("/configurations/{resource}")
async def create_configuration(resource: str, service: Service, user: CurrentUser, payload: ConfigurationPayload):
    if resource not in CONFIGURATION_RESOURCES: raise HTTPException(status_code=404, detail="Recurso de configuração inválido")
    require_admin(user)
    return await service.create_configuration(resource, payload)


@router.patch("/configurations/{resource}/{identifier}")
async def update_configuration(resource: str, identifier: str, service: Service, user: CurrentUser, payload: ConfigurationPayload):
    if resource not in CONFIGURATION_RESOURCES: raise HTTPException(status_code=404, detail="Recurso de configuração inválido")
    require_admin(user)
    return await service.update_configuration(resource, identifier, payload)


@router.delete("/configurations/{resource}/{identifier}")
async def delete_configuration(resource: str, identifier: str, service: Service, user: CurrentUser):
    if resource not in CONFIGURATION_RESOURCES: raise HTTPException(status_code=404, detail="Recurso de configuração inválido")
    require_admin(user)
    await service.delete_configuration(resource, identifier)
    return {"deleted": True}


@router.get("/users")
async def users(service: Service, _: CurrentUser):
    logger.info("platform_users_read")
    return {"users": await service.users()}


@router.get("/folders")
async def folders(service: Service, _: CurrentUser, projectId: str = Query(min_length=1)):
    logger.info("platform_folders_read project_id=%s", projectId)
    return await service.folders(projectId)


@router.get("/dashboard/summary")
async def dashboard(service: Service, _: CurrentUser):
    logger.info("platform_dashboard_read")
    return await service.dashboard()


@router.get("/activity-logs")
async def activity_logs(service: Service, _: CurrentUser, page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=500)):
    logger.info("platform_activity_logs_read page=%s limit=%s", page, limit)
    return await service.activity_logs(page, limit)


@router.get("/access-map")
async def access_map(service: Service, _: CurrentUser):
    logger.info("platform_access_map_read")
    return await service.access_map()


@router.get("/access-map/export")
async def export_access_map(service: Service, _: CurrentUser, format: str = Query("csv"), fields: str = ""):
    data = await service.access_map()
    output = io.StringIO()
    rows = data.get("rows", [])
    columns = [column for column in fields.split(",") if column] or (list(rows[0].keys()) if rows else ["userId", "projectId", "resourceId"])
    writer = csv.DictWriter(output, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)
    media_type = "text/csv" if format == "csv" else "text/plain"
    return StreamingResponse(iter([output.getvalue()]), media_type=media_type, headers={"Content-Disposition": "attachment; filename=mapa-de-acessos.csv"})
