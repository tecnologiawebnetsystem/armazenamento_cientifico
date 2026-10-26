import csv
import io
import logging
from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import CurrentUser, require_capabilities
from app.core.authorization import require_capability
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


@router.get("/dashboard/summary")
async def dashboard(service: Service, _: Annotated[dict, Depends(require_capabilities("read"))]):
    logger.info("platform_dashboard_read")
    return await service.dashboard()


@router.get("/access-map")
async def access_map(service: Service, _: Annotated[dict, Depends(require_capabilities("access_map"))]):
    logger.info("platform_access_map_read")
    return await service.access_map()


@router.get("/access-map/export")
async def export_access_map(service: Service, _: Annotated[dict, Depends(require_capabilities("access_map"))], format: str = Query("csv"), fields: str = ""):
    data = await service.access_map()
    output = io.StringIO()
    rows = data.get("rows", [])
    columns = [column for column in fields.split(",") if column] or (list(rows[0].keys()) if rows else ["userId", "projectId", "resourceId"])
    writer = csv.DictWriter(output, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)
    media_type = "text/csv" if format == "csv" else "text/plain"
    return StreamingResponse(iter([output.getvalue()]), media_type=media_type, headers={"Content-Disposition": "attachment; filename=mapa-de-acessos.csv"})
