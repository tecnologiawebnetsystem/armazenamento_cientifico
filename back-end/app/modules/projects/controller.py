from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import CurrentUser, require_capabilities
from app.core.authorization import canonical_role, require_capability
from app.core.exceptions import ConflictException
from app.db.session import get_session
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

router = APIRouter(prefix="/api/projects", tags=["Projects"])


def get_service(session: Annotated[AsyncSession, Depends(get_session)]) -> ProjectService:
    return ProjectService(ProjectRepository(session))


def serialize_project(project: Project) -> ProjectOut:
    return ProjectOut(
        id=project.id, nome=project.name, codigo=project.code,
        areaResponsavel=project.responsible_area, descricao=project.description,
        status=project.status, gestoresIds=project.managers_ids or [],
        participantesIds=project.participants_ids or [], criadoEm=project.created_at,
        atualizadoEm=project.updated_at, pastaMae=project.parent_folder or "",
    )


def project_not_found() -> HTTPException:
    return HTTPException(status_code=404, detail="Projeto não encontrado")


def serialize_members(rows) -> list[ProjectMemberOut]:
    return [
        ProjectMemberOut(
            projectId=member.project_id, userId=member.user_id,
            papel=member.role,
            adicionadoEm=member.created_at,
            user={"id": user.id, "userId": user.user_id, "perfilId": user.profile_id},
        )
        for member, user in rows
    ]


@router.get("", response_model=dict)
async def list_projects(service: Annotated[ProjectService, Depends(get_service)], user: CurrentUser):
    role = user["role"] or "solicitante"
    projects = await service.list_projects(str(user["id"]), str(role))
    return {"projects": [serialize_project(project) for project in projects]}


@router.post("", response_model=dict, status_code=201)
async def create_project(
    data: ProjectCreate,
    service: Annotated[ProjectService, Depends(get_service)],
    user: CurrentUser,
):
    if canonical_role(user.get("role")) in {"gerente", "patrocinador", "auditor", "solicitante"}:
        raise HTTPException(status_code=403, detail="Este perfil não pode criar projetos")
    require_capability(user, "create")
    try:
        project = await service.create_project(data)
    except ConflictException as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return {"project": serialize_project(project)}


@router.patch("/{project_id}", response_model=dict)
async def update_project(
    project_id: str,
    data: ProjectPatch,
    service: Annotated[ProjectService, Depends(get_service)],
    _: Annotated[dict, Depends(require_capabilities("update"))],
):
    try:
        project = await service.update_project(project_id, data)
    except LookupError as error:
        raise project_not_found() from error
    return {"project": serialize_project(project)}


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: str,
    service: Annotated[ProjectService, Depends(get_service)],
    _: Annotated[dict, Depends(require_capabilities("delete"))],
):
    if not await service.delete_project(project_id):
        raise project_not_found()


@router.get("/areas", response_model=dict)
async def list_responsible_areas(service: Annotated[ProjectService, Depends(get_service)], _: CurrentUser):
    areas = await service.list_areas()
    return {"areas": [{"id": area.id, "nome": area.name, "prefixo": area.prefix, "proximoCodigo": area.preview_code()} for area in areas]}


@router.get("/{project_id}", response_model=dict)
async def get_project(project_id: str, service: Annotated[ProjectService, Depends(get_service)], user: CurrentUser):
    project = await service.get_project(project_id)
    if not project:
        raise project_not_found()
    role = user["role"] or "solicitante"
    if not await service.can_view(project_id, str(user["id"]), str(role)):
        raise HTTPException(status_code=403, detail="Sem acesso a este projeto")
    return {"project": serialize_project(project)}


@router.get(
    "/{project_id}/access-map",
    response_model=AccessMapOut,
    summary="Consultar mapa de acessos do projeto",
    description="Consolida o projeto, grupos, membros e a fonte/instante da consulta, respeitando o escopo autorizado.",
    responses={
        403: {"description": "Usuário sem a capacidade access_map ou sem acesso ao projeto."},
        404: {"description": "Projeto inexistente."},
        502: {"description": "Falha na fonte de dados necessária para consolidar o mapa."},
    },
)
async def get_project_access_map(
    project_id: str,
    service: Annotated[ProjectService, Depends(get_service)],
    user: Annotated[dict, Depends(require_capabilities("access_map"))],
):
    project = await service.get_project(project_id)
    if not project:
        raise project_not_found()
    role = user.get("role") or "solicitante"
    if not await service.can_view(project_id, str(user.get("id")), str(role)):
        raise HTTPException(status_code=403, detail="Sem acesso a este projeto")
    try:
        members = serialize_members(await service.list_members(project_id))
    except (SQLAlchemyError, OSError, TimeoutError) as error:
        raise HTTPException(status_code=502, detail="Falha ao consultar a fonte de acessos") from error
    groups, gaps = [], []
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
    return AccessMapOut(
        project=serialize_project(project), projectId=project.id, groups=groups,
        members=members, source="database", consultedAt=datetime.now(UTC), gaps=gaps,
    )


@router.get("/layered", response_model=list[ProjectOut])
async def list_projects_layered(
    service: Annotated[ProjectService, Depends(get_service)],
    _: CurrentUser,
    x_user_id: Annotated[str, Header()] = "",
    x_user_role: Annotated[str, Header()] = "solicitante",
):
    return [serialize_project(project) for project in await service.list_projects(x_user_id, x_user_role)]


@router.get("/{project_id}/members", response_model=list[ProjectMemberOut])
async def list_project_members(project_id: str, service: Annotated[ProjectService, Depends(get_service)], _: CurrentUser):
    return serialize_members(await service.list_members(project_id))
