from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import ActivityLog


class ActivityLogRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(self, limit: int = 100) -> list[ActivityLog]:
        return list(
            (
                await self.session.scalars(
                    select(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(limit)
                )
            ).all()
        )
