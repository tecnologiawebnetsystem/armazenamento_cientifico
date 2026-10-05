import json
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import ActivityLog


class ActivityLogRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, *, user_id: str, action: str, entity: str, entity_id: str | None, details: dict[str, object], result: str) -> ActivityLog:
        log = ActivityLog(
            id=str(uuid4()),
            user_id=user_id,
            action=action,
            entity=entity,
            entity_id=entity_id,
            details=json.dumps(details, ensure_ascii=False, default=str),
            result=result,
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
