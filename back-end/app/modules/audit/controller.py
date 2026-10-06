from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import CurrentUser, require_capabilities
from app.db.session import get_session

from .repository import ActivityLogRepository
from .schemas import ActivityLogIn, ActivityLogOut, ActivityLogPage
from .service import AuditService

router = APIRouter(prefix="/api/audit", tags=["Audit"])


def get_service(session: Annotated[AsyncSession, Depends(get_session)]) -> AuditService:
    return AuditService(ActivityLogRepository(session))


ServiceDependency = Annotated[AuditService, Depends(get_service)]


@router.post("/events", response_model=ActivityLogOut, status_code=status.HTTP_201_CREATED)
async def record_event(request: Request, payload: ActivityLogIn, user: CurrentUser, service: ServiceDependency):
    user_id = str(user.get("user_id") or user.get("id") or "")
    # O cabeçalho pode ser forjado por clientes; use o peer TCP até existir
    # uma configuração explícita de proxy confiável.
    ip_address = request.client.host if request.client else None
    correlation_id = request.headers.get("x-request-id")
    server_details = {
        **payload.details,
        "user_agent_servidor": request.headers.get("user-agent"),
    }
    return await service.record_event(
        user_id=user_id,
        action=payload.action,
        entity=payload.entity,
        entity_id=payload.entity_id,
        details=server_details,
        result=payload.result,
        correlation_id=correlation_id,
        http_method=request.method,
        route=request.url.path,
        ip_address=ip_address,
    )


@router.get("/logs", response_model=ActivityLogPage)
async def list_logs(
    request: Request,
    service: ServiceDependency,
    _: Annotated[dict, Depends(require_capabilities("audit"))],
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=25, ge=1, le=100),
    q: str | None = Query(default=None, max_length=120),
    user_id: str | None = Query(default=None, max_length=100),
    action: str | None = Query(default=None, max_length=100),
    entity: str | None = Query(default=None, max_length=100),
    project_id: str | None = Query(default=None, max_length=100),
    result: str | None = Query(default=None, max_length=30),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
):
    rows, total = await service.list_logs(page=page, limit=limit, query=q, user_id=user_id, action=action, entity=entity, project_id=project_id, result=result, date_from=date_from, date_to=date_to)
    return {"items": rows, "page": page, "limit": limit, "total": total, "total_pages": (total + limit - 1) // limit}
