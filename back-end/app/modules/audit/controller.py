from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import CurrentUser, require_capabilities
from app.db.session import get_session

from .repository import ActivityLogRepository
from .schemas import ActivityLogIn, ActivityLogOut
from .service import AuditService

router = APIRouter(prefix="/api/audit", tags=["Audit"])


def get_service(session: Annotated[AsyncSession, Depends(get_session)]) -> AuditService:
    return AuditService(ActivityLogRepository(session))


ServiceDependency = Annotated[AuditService, Depends(get_service)]


@router.post("/events", response_model=ActivityLogOut, status_code=status.HTTP_201_CREATED)
async def record_event(payload: ActivityLogIn, user: CurrentUser, service: ServiceDependency):
    user_id = str(user.get("user_id") or user.get("id") or "")
    return await service.record_event(
        user_id=user_id,
        action=payload.action,
        entity=payload.entity,
        entity_id=payload.entity_id,
        details=payload.details,
        result=payload.result,
    )


@router.get("/logs", response_model=list[ActivityLogOut])
async def list_logs(
    service: ServiceDependency,
    _: Annotated[dict, Depends(require_capabilities("audit"))],
    limit: int = Query(default=100, ge=1, le=500),
):
    return await service.list_logs(limit)
