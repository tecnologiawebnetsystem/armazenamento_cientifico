from typing import Annotated

from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import CurrentUser, require_roles
from app.db.session import get_session
from app.modules.projects.repository import ProjectRepository
from app.modules.projects.schemas import ProjectOut
from app.modules.projects.service import ProjectService

router = APIRouter(prefix="/api/projects", tags=["Projects"])


def get_service(session: Annotated[AsyncSession, Depends(get_session)]) -> ProjectService:
    return ProjectService(ProjectRepository(session))


@router.get("/layered", response_model=list[ProjectOut])
async def list_projects_layered(
    service: Annotated[ProjectService, Depends(get_service)],
    _: CurrentUser,
    x_user_id: Annotated[str, Header()] = "",
    x_user_role: Annotated[str, Header()] = "participante",
):
    """Endpoint de transição para validar a nova camada sem quebrar o contrato atual."""
    return await service.list_projects(x_user_id, x_user_role)
