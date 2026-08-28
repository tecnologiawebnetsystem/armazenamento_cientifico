from typing import Annotated

from fastapi import APIRouter, Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.projects.member_model import ProjectMember
from app.modules.users.models import User

from app.api.dependencies import CurrentUser
from app.db.session import get_session
from app.modules.projects.repository import ProjectRepository
from app.modules.projects.schemas import ProjectMemberOut, ProjectOut
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


@router.get("/{project_id}/members", response_model=list[ProjectMemberOut])
async def list_project_members(
    project_id: str,
    session: Annotated[AsyncSession, Depends(get_session)],
    _: CurrentUser,
):
    """Lista membros persistidos e seus dados básicos, sem depender de JSON no projeto."""
    statement = (
        select(ProjectMember, User)
        .join(User, User.id == ProjectMember.user_id)
        .where(ProjectMember.project_id == project_id)
        .order_by(User.name)
    )
    rows = (await session.execute(statement)).all()
    return [
        ProjectMemberOut(
            projectId=member.project_id,
            userId=member.user_id,
            papel=member.role,
            adicionadoEm=member.created_at,
            user={"id": user.id, "nome": user.name, "email": user.email, "cargo": user.cargo, "area": user.area},
        )
        for member, user in rows
    ]
