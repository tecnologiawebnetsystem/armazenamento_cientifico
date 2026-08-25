from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import CurrentUser
from app.db.session import get_session

from .repository import ActivityLogRepository
from .schemas import ActivityLogOut
from .service import AuditService

router = APIRouter(prefix="/api/audit", tags=["Audit"])


def get_service(session: Annotated[AsyncSession, Depends(get_session)]) -> AuditService:
    return AuditService(ActivityLogRepository(session))


ServiceDependency = Annotated[AuditService, Depends(get_service)]


@router.get("/logs", response_model=list[ActivityLogOut])
async def list_logs(
    service: ServiceDependency,
    _: CurrentUser,
    limit: int = Query(default=100, ge=1, le=500),
):
    return await service.list_logs(limit)
