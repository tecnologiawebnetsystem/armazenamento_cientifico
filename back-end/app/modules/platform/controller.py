import csv
import io
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import CurrentUser
from app.db.session import get_session

from .repository import PlatformRepository
from .schemas import AccessRequestCreate, AccessRequestUpdate, SettingsUpdate
from .service import PlatformService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Platform"])


def service_dependency(session: Annotated[AsyncSession, Depends(get_session)]) -> PlatformService:
    return PlatformService(PlatformRepository(session))


Service = Annotated[PlatformService, Depends(service_dependency)]


@router.get("/platform/context")
async def platform_context(service: Service, user: CurrentUser):
    logger.info("platform_context_read user_id=%s", user["id"])
    return await service.context(user["id"])


@router.get("/catalogos")
async def catalogs(service: Service, _: CurrentUser):
    logger.info("platform_catalogs_read")
    return await service.catalogs()


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


@router.get("/access-requests")
async def access_requests(service: Service, _: CurrentUser):
    logger.info("platform_access_requests_read")
    return await service.access_requests()


@router.post("/access-requests", status_code=201)
async def create_access_request(payload: AccessRequestCreate, service: Service, user: CurrentUser):
    logger.info("platform_access_request_create user_id=%s", user["id"])
    return await service.create_access_request(user["id"], payload.model_dump())


@router.patch("/access-requests/{request_id}")
async def update_access_request(request_id: str, payload: AccessRequestUpdate, service: Service, user: CurrentUser):
    logger.info("platform_access_request_update request_id=%s user_id=%s", request_id, user["id"])
    return await service.update_access_request(request_id, payload.status, user["id"])


@router.get("/settings")
async def settings(service: Service, _: CurrentUser):
    return await service.settings()


@router.patch("/settings")
async def update_settings(payload: SettingsUpdate, service: Service, _: CurrentUser):
    logger.info("platform_settings_update keys=%s", sorted(payload.values.keys()))
    return await service.update_settings(payload.values)


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
