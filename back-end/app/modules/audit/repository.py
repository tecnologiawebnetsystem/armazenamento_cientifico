import json
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import and_, func, or_, select

from app.core.audit import mask_sensitive
from app.modules.users.models import User
from app.modules.projects.models import Project
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
        resolved_user_id = user_id if user_id and await self.session.scalar(select(User.user_id).where(User.user_id == user_id)) else None
        safe_details = mask_sensitive(details)
        if resolved_user_id is None and user_id:
            safe_details = {**safe_details, "usuario_auditoria_nao_localizado": user_id}

        # A coluna legada aceita UUIDs de até 36 caracteres. Rotas e outros
        # identificadores longos permanecem preservados em details/route.
        safe_entity_id = entity_id if entity_id and len(entity_id) <= 36 else None
        log = ActivityLog(
            id=str(uuid4()),
            user_id=resolved_user_id,
            action=action,
            entity=entity,
            entity_id=safe_entity_id,
            details=json.dumps(safe_details, ensure_ascii=False, default=str),
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
        project_name: str | None = None,
        result: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> tuple[list[dict], int]:
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
        if project_name:
            project_term = f"%{project_name.strip()}%"
            # Alguns eventos antigos, como consultas ao mapa de acessos,
            # registram o nome apenas nos detalhes e não em project_id.
            filters.append(or_(Project.name.ilike(project_term), ActivityLog.details.ilike(project_term)))
        if result:
            filters.append(ActivityLog.result == result)
        if date_from:
            filters.append(ActivityLog.created_at >= _database_datetime(date_from))
        if date_to:
            filters.append(ActivityLog.created_at <= _database_datetime(date_to))
        predicate = and_(*filters) if filters else None

        # Join com User para resolver userName e userEmail
        joined_query = select(ActivityLog, User.user_id.label("_user_name"), Project.name.label("_project_name")).outerjoin(
            User, ActivityLog.user_id == User.user_id
        ).outerjoin(Project, ActivityLog.project_id == Project.id).order_by(ActivityLog.created_at.desc(), ActivityLog.id.desc())

        count_query = select(func.count(ActivityLog.id)).select_from(ActivityLog).outerjoin(Project, ActivityLog.project_id == Project.id)

        if predicate is not None:
            joined_query = joined_query.where(predicate)
            count_query = count_query.where(predicate)

        total = int((await self.session.scalar(count_query)) or 0)
        results = await self.session.execute(joined_query.offset((page - 1) * limit).limit(limit))
        rows = []
        for log, user_name, project_name_value in results:
            log_dict = {
                "id": log.id,
                "user_id": log.user_id,
                "user_name": user_name,
                "user_email": None,
                "action": log.action,
                "entity": log.entity,
                "entity_id": log.entity_id,
                "details": log.details,
                "result": log.result,
                "correlation_id": log.correlation_id,
                "http_method": log.http_method,
                "route": log.route,
                "duration_ms": log.duration_ms,
                "ip_address": log.ip_address,
                "project_id": log.project_id,
                "project_name": project_name_value,
                "created_at": log.created_at,
            }
            rows.append(log_dict)

        return rows, total

    async def list(self, limit: int = 100) -> list[ActivityLog]:
        rows, _ = await self.list_page(page=1, limit=limit)
        return rows
