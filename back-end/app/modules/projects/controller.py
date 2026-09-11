from datetime import UTC, datetime
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import CurrentUser, require_roles
from app.db.session import get_session
from app.modules.projects.member_model import ProjectMember
from app.modules.projects.models import Project
from app.modules.projects.repository import ProjectRepository
from app.modules.projects.schemas import (
    AccessMapGroupOut,
    AccessMapOut,
    ProjectCreate,
    ProjectMemberOut,
    ProjectOut,
    ProjectPatch,
)
from app.modules.projects.service import ProjectService
from app.modules.users.models import User

router = APIRouter(prefix="/api/projects", tags=["Projects"])


def get_service(session: Annotated[AsyncSession, Depends(get_session)]) -> ProjectService:
    return ProjectService(ProjectRepository(session))


def serialize_project(project: Project) -> ProjectOut:
    return ProjectOut(
        id=project.id, nome=project.name, codigo=project.code, areaResponsavel=project.responsible_area,
        descricao=project.description, status=project.status, gestoresIds=project.managers_ids or [],
        participantesIds=project.participants_ids or [], criadoEm=project.created_at, atualizadoEm=project.updated_at,
    )


@router.get("", response_model=dict)
async def list_projects(
    service: Annotated[ProjectService, Depends(get_service)],
    user: CurrentUser,
):
    role = user["role"] if user["role"] else "participante"
    projects = await service.list_projects(str(user["id"]), str(role))
    return {"projects": [serialize_project(project) for project in projects]}


@router.post("", response_model=dict, status_code=201)
async def create_project(
    data: ProjectCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[dict, Depends(require_roles("admin"))],
):
    await ProjectService(ProjectRepository(session)).ensure_code_available(data.codigo)
    now = datetime.now(UTC)
    project = Project(id=str(uuid4()), name=data.nome, code=data.codigo, responsible_area=data.areaResponsavel,
        managers_ids=data.gestoresIds, description=data.descricao, status=data.status,
        participants_ids=data.participantesIds, write_group=data.grupoAdEscrita, read_group=data.grupoAdLeitura, write_identity_role=data.roleIdentidadeEscrita, read_identity_role=data.roleIdentidadeLeitura, snow_task_number=data.numeroTarefaSnow, parent_folder=data.pastaMae, created_at=now, updated_at=now)
    session.add(project)
    await session.commit()
    return {"project": serialize_project(project)}


@router.patch("/{project_id}", response_model=dict)
async def update_project(
    project_id: str,
    data: ProjectPatch,
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict, Depends(require_roles("admin"))],
):
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    values = {"name": data.nome, "responsible_area": data.areaResponsavel, "description": data.descricao, "status": data.status, "write_group": data.grupoAdEscrita, "read_group": data.grupoAdLeitura, "write_identity_role": data.roleIdentidadeEscrita, "read_identity_role": data.roleIdentidadeLeitura}
    for key, value in values.items():
        if value is not None:
            setattr(project, key, value)
    project.updated_at = datetime.now(UTC)
    await session.commit()
    return {"project": serialize_project(project)}


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: str,
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[dict, Depends(require_roles("admin"))],
):
    project = await session.get(Project, project_id)
    if project:
        await session.delete(project)
        await session.commit()


@router.get("/{project_id}", response_model=dict)
async def get_project(project_id: str, session: Annotated[AsyncSession, Depends(get_session)], user: CurrentUser):
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    role = user["role"] or "participante"
    if not await ProjectRepository(session).can_view(project_id, str(user["id"]), role):
        raise HTTPException(status_code=403, detail="Sem acesso a este projeto")
    return {"project": serialize_project(project)}


@router.get("/{project_id}/access-map", response_model=AccessMapOut)
async def get_project_access_map(project_id: str, session: Annotated[AsyncSession, Depends(get_session)], user: CurrentUser):
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    role = user["role"] or "participante"
    if not await ProjectRepository(session).can_view(project_id, str(user["id"]), role):
        raise HTTPException(status_code=403, detail="Sem acesso a este projeto")
    statement = select(ProjectMember, User).join(User, User.id == ProjectMember.user_id).where(ProjectMember.project_id == project_id).order_by(User.name)
    rows = (await session.execute(statement)).all()
    members = [ProjectMemberOut(projectId=m.project_id, userId=m.user_id, papel=m.role, adicionadoEm=m.created_at, user={"id": u.id, "nome": u.name, "email": u.email, "cargo": u.cargo, "area": u.area}) for m, u in rows]
    groups = []
    gaps = []
    if project.read_group:
        groups.append(AccessMapGroupOut(nome=project.read_group, fonte="projeto", identificadores=[project.read_group], nivel="leitura"))
    else:
        gaps.append("grupo de leitura não configurado")
    if project.write_group:
        groups.append(AccessMapGroupOut(nome=project.write_group, fonte="projeto", identificadores=[project.write_group], nivel="escrita"))
    else:
        gaps.append("grupo de escrita não configurado")
    if not members:
        gaps.append("projeto sem membros vinculados")
    return AccessMapOut(projectId=project.id, groups=groups, members=members, source="database", consultedAt=datetime.now(UTC), gaps=gaps)


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
