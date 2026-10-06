import json
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import select

from app.core.audit import mask_sensitive
from sqlalchemy.ext.asyncio import AsyncSession

from .models import ActivityLog


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
            created_at=datetime.now(UTC),
        )
        self.session.add(log)
        await self.session.commit()
        return log

    async def list(self, limit: int = 100) -> list[ActivityLog]:
        return list(
            (
                await self.session.scalars(
                    select(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(limit)
                )
            ).all()
        )
