import json
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import and_, func, or_, select

from app.core.audit import mask_sensitive
from sqlalchemy.ext.asyncio import AsyncSession

from .models import ActivityLog


def _database_datetime(value: datetime) -> datetime:
    """Converte datas para UTC sem tzinfo, compatível com TIMESTAMP WITHOUT TIME ZONE."""
    if value.tzinfo is None:
        return value
    return value.astimezone(UTC).replace(tzinfo=None)


class ActivityLogRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, *, user_id: str, action: str, entity: str, entity_id: str | None, details: dict[str, object], result: str, correlation_id: str | None = None, http_method: str | None = None, route: str | None = None, duration_ms: float | None = None, ip_address: str | None = None) -> ActivityLog:
        log = ActivityLog(
            id=str(uuid4()),
            user_id=user_id,
            action=action,
            entity=entity,
            entity_id=entity_id,
            details=json.dumps(mask_sensitive(details), ensure_ascii=False, default=str),
            result=result,
            correlation_id=correlation_id,
            http_method=http_method,
            route=route,
            duration_ms=duration_ms,
            ip_address=ip_address,
            created_at=_database_datetime(datetime.now(UTC)),
        )
        self.session.add(log)
        await self.session.commit()
        return log

    async def list_page(
        self,
        *,
        page: int,
        limit: int,
        query: str | None = None,
        user_id: str | None = None,
        action: str | None = None,
        entity: str | None = None,
        project_id: str | None = None,
        result: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> tuple[list[ActivityLog], int]:
        filters = []
        if query:
            term = f"%{query.strip()}%"
            filters.append(or_(ActivityLog.user_id.ilike(term), ActivityLog.action.ilike(term), ActivityLog.entity.ilike(term), ActivityLog.entity_id.ilike(term), ActivityLog.route.ilike(term)))
        if user_id:
            filters.append(ActivityLog.user_id == user_id)
        if action:
            filters.append(ActivityLog.action == action)
        if entity:
            filters.append(ActivityLog.entity == entity)
        if project_id:
            filters.append(ActivityLog.project_id == project_id)
        if result:
            filters.append(ActivityLog.result == result)
        if date_from:
            filters.append(ActivityLog.created_at >= _database_datetime(date_from))
        if date_to:
            filters.append(ActivityLog.created_at <= _database_datetime(date_to))
        predicate = and_(*filters) if filters else None
        count_query = select(func.count()).select_from(ActivityLog)
        data_query = select(ActivityLog).order_by(ActivityLog.created_at.desc(), ActivityLog.id.desc()).offset((page - 1) * limit).limit(limit)
        if predicate is not None:
            count_query = count_query.where(predicate)
            data_query = data_query.where(predicate)
        total = int((await self.session.scalar(count_query)) or 0)
        rows = list((await self.session.scalars(data_query)).all())
        return rows, total

    async def list(self, limit: int = 100) -> list[ActivityLog]:
        rows, _ = await self.list_page(page=1, limit=limit)
        return rows
