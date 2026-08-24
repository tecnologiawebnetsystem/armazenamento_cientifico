from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, StreamingResponse
from pydantic import BaseModel, ConfigDict, Field, EmailStr

Role = Literal["admin", "gerente", "patrocinador", "auditor", "participante", "visualizador", "gestor"]
ProjectStatus = Literal["ativo", "concluido", "suspenso"]
ShareLevel = Literal["leitura", "edicao", "proprietario"]


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


class User(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    nome: str
    email: EmailStr
    cargo: str = ""
    area: str = ""
    role: Role
    criadoEm: str


class LoginPayload(BaseModel):
    email: EmailStr
    senha: str = Field(min_length=1)


class Project(BaseModel):
    id: str
    nome: str
    codigo: str
    areaResponsavel: str
    gestoresIds: list[str] = []
    grupoAdEscrita: str = ""
    grupoAdLeitura: str = ""
    roleIdentidadeEscrita: str = ""
    roleIdentidadeLeitura: str = ""
    numeroTarefaSnow: str = ""
    pastaMae: str = ""
    descricao: str = ""
    status: ProjectStatus = "ativo"
    criadoEm: str
    atualizadoEm: str
    participantesIds: list[str] = []
    armazenamentoUsadoMb: float = 0


class ProjectInput(BaseModel):
    nome: str = Field(min_length=2, max_length=200)
    codigo: str = Field(min_length=1, max_length=50)
    areaResponsavel: str = Field(min_length=1, max_length=150)
    gestoresIds: list[str] = []
    grupoAdEscrita: str = ""
    grupoAdLeitura: str = ""
    roleIdentidadeEscrita: str = ""
    roleIdentidadeLeitura: str = ""
    numeroTarefaSnow: str = ""
    pastaMae: str = ""
    descricao: str = ""
    status: ProjectStatus = "ativo"
    participantesIds: list[str] = []


class ProjectPatch(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=200)
    areaResponsavel: str | None = None
    gestoresIds: list[str] | None = None
    grupoAdEscrita: str | None = None
    grupoAdLeitura: str | None = None
    roleIdentidadeEscrita: str | None = None
    roleIdentidadeLeitura: str | None = None
    numeroTarefaSnow: str | None = None
    pastaMae: str | None = None
    descricao: str | None = None
    status: ProjectStatus | None = None
    participantesIds: list[str] | None = None


class FileNode(BaseModel):
    id: str
    projectId: str
    parentId: str | None = None
    tipo: Literal["pasta", "arquivo"]
    nome: str
    tamanho: int = 0
    mimeType: str | None = None
    criadoPor: str
    criadoEm: str
    atualizadoEm: str
    compartilhamentos: list[dict] = []


class FileInput(BaseModel):
    projectId: str
    parentId: str | None = None
    tipo: Literal["pasta", "arquivo"]
    nome: str = Field(min_length=1, max_length=500)
    tamanho: int = Field(default=0, ge=0)
    mimeType: str | None = None


class ActivityLog(BaseModel):
    id: str
    userId: str
    acao: str
    entidade: str
    entidadeId: str
    detalhes: str = ""
    criadoEm: str


class ReportsQuery(BaseModel):
    model_config = ConfigDict(extra="ignore")
    periodoDe: str | None = None
    periodoAte: str | None = None
    status: ProjectStatus | Literal["todos"] = "todos"
    area: str | None = None
    projectId: str | None = None


users: dict[str, User] = {}
projects: dict[str, Project] = {}
files: dict[str, FileNode] = {}
logs: list[ActivityLog] = []


def seed() -> None:
    for role, email, name in [
        ("admin", "admin@exemplo.com", "Administrador"),
        ("gerente", "gerente@exemplo.com", "Gerente de Projeto"),
        ("patrocinador", "patrocinador@exemplo.com", "Patrocinador"),
        ("auditor", "auditor@exemplo.com", "Auditor"),
    ]:
        user = User(id=f"u-{role}", nome=name, email=email, cargo=name, area="Corporativo", role=role, criadoEm=now())
        users[user.id] = user
    project = Project(id="PRJ-2024-001", nome="Armazenamento Científico", codigo="PRJ-2024-001", areaResponsavel="Tecnologia", gestoresIds=["u-gerente"], grupoAdEscrita="GRP-ESCRITA", grupoAdLeitura="GRP-LEITURA", numeroTarefaSnow="SNOW-001", pastaMae="/cientifico/2024", descricao="Projeto de demonstração", criadoEm=now(), atualizadoEm=now())
    projects[project.id] = project


seed()

app = FastAPI(title="Armazenamento Científico API", version="1.0.0", docs_url="/docs", openapi_url="/openapi.json")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


def current_user(request: Request) -> User:
    user_id = request.headers.get("x-user-id") or request.cookies.get("wayon_session_user_id") or "u-admin"
    return users.get(user_id, users["u-admin"])


def can_view_project(user: User, project: Project) -> bool:
    return user.role in {"admin", "patrocinador", "auditor"} or user.id in project.gestoresIds or user.id in project.participantesIds


def require_role(user: User, roles: set[str]) -> None:
    if user.role not in roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário sem permissão para esta operação")


def audit(user: User, action: str, entity: str, entity_id: str, details: str = "") -> None:
    logs.insert(0, ActivityLog(id=str(uuid4()), userId=user.id, acao=action, entidade=entity, entidadeId=entity_id, detalhes=details, criadoEm=now()))


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "fastapi", "version": app.version}


@app.post("/api/auth/login")
def login(payload: LoginPayload, response: Response) -> dict:
    user = next((item for item in users.values() if item.email.lower() == payload.email.lower()), None)
    if not user or payload.senha not in {"admin123", "gerente123", "patrocinador123", "auditor123"}:
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
    response.set_cookie("wayon_session_user_id", user.id, httponly=True, samesite="lax", max_age=28800)
    audit(user, "login", "sessao", user.id)
    return {"user": user.model_dump()}


@app.post("/api/auth/logout", status_code=204)
def logout(request: Request, response: Response) -> None:
    audit(current_user(request), "logout", "sessao", current_user(request).id)
    response.delete_cookie("wayon_session_user_id")


@app.get("/api/auth/session")
def session(request: Request) -> dict:
    return {"user": current_user(request).model_dump()}


@app.get("/api/projects")
def list_projects(request: Request, all: bool = False) -> dict:
    user = current_user(request)
    visible = list(projects.values()) if all and user.role in {"admin", "patrocinador", "auditor"} else [p for p in projects.values() if can_view_project(user, p)]
    return {"projects": [p.model_dump() for p in visible]}


@app.post("/api/projects")
def create_project(payload: ProjectInput, request: Request) -> dict:
    user = current_user(request)
    require_role(user, {"admin", "gerente"})
    if payload.codigo in {p.codigo for p in projects.values()}:
        raise HTTPException(409, "Código de projeto já existente")
    project = Project(id=str(uuid4()), criadoEm=now(), atualizadoEm=now(), **payload.model_dump())
    projects[project.id] = project
    audit(user, "criar-projeto", "projeto", project.id, project.nome)
    return {"project": project.model_dump()}


@app.get("/api/projects/{project_id}")
def get_project(project_id: str, request: Request) -> dict:
    user = current_user(request)
    project = projects.get(project_id)
    if not project or not can_view_project(user, project):
        raise HTTPException(404, "Projeto não encontrado")
    return {"project": project.model_dump()}


@app.patch("/api/projects/{project_id}")
def update_project(project_id: str, payload: ProjectPatch, request: Request) -> dict:
    user = current_user(request)
    project = projects.get(project_id)
    if not project or not can_view_project(user, project):
        raise HTTPException(404, "Projeto não encontrado")
    require_role(user, {"admin", "gerente"})
    if user.role == "gerente" and user.id not in project.gestoresIds:
        raise HTTPException(403, "Gerente não pertence a este projeto")
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(project, key, value)
    project.atualizadoEm = now()
    audit(user, "editar-projeto", "projeto", project.id, ",".join(updates.keys()))
    return {"project": project.model_dump()}


@app.delete("/api/projects/{project_id}", status_code=204)
def delete_project(project_id: str, request: Request) -> None:
    user = current_user(request)
    project = projects.get(project_id)
    if not project:
        raise HTTPException(404, "Projeto não encontrado")
    require_role(user, {"admin"})
    del projects[project_id]
    audit(user, "excluir-projeto", "projeto", project_id)


@app.get("/api/files")
def list_files(projectId: str, request: Request, parentId: str | None = None, allFolders: bool = False) -> dict:
    project = projects.get(projectId)
    if not project or not can_view_project(current_user(request), project):
        raise HTTPException(404, "Projeto não encontrado")
    result = [f for f in files.values() if f.projectId == projectId and (allFolders and f.tipo == "pasta" or not allFolders and f.parentId == parentId)]
    return {"files": [f.model_dump() for f in result], "breadcrumb": []}


@app.post("/api/files")
def create_file(payload: FileInput, request: Request) -> dict:
    user = current_user(request)
    project = projects.get(payload.projectId)
    if not project or not can_view_project(user, project):
        raise HTTPException(404, "Projeto não encontrado")
    if user.role in {"visualizador", "auditor", "patrocinador"}:
        raise HTTPException(403, "Usuário sem permissão de edição")
    item = FileNode(id=str(uuid4()), criadoPor=user.id, criadoEm=now(), atualizadoEm=now(), **payload.model_dump())
    files[item.id] = item
    audit(user, "criar-pasta" if item.tipo == "pasta" else "enviar-arquivo", "arquivo", item.id, item.nome)
    return {"file": item.model_dump()}


@app.get("/api/files/{file_id}")
def get_file(file_id: str, request: Request) -> dict:
    item = files.get(file_id)
    if not item:
        raise HTTPException(404, "Arquivo não encontrado")
    project = projects.get(item.projectId)
    if not project or not can_view_project(current_user(request), project):
        raise HTTPException(404, "Arquivo não encontrado")
    return {"file": item.model_dump()}


class FilePatch(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=500)
    parentId: str | None = None


@app.patch("/api/files/{file_id}")
def update_file(file_id: str, payload: FilePatch, request: Request) -> dict:
    user = current_user(request)
    item = files.get(file_id)
    if not item:
        raise HTTPException(404, "Arquivo não encontrado")
    project = projects.get(item.projectId)
    if not project or not can_view_project(user, project):
        raise HTTPException(404, "Arquivo não encontrado")
    if user.role in {"visualizador", "auditor", "patrocinador"}:
        raise HTTPException(403, "Usuário sem permissão de edição")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    item.atualizadoEm = now()
    audit(user, "editar-arquivo", "arquivo", item.id, item.nome)
    return {"file": item.model_dump()}


@app.delete("/api/files/{file_id}", status_code=204)
def delete_file(file_id: str, request: Request) -> None:
    user = current_user(request)
    item = files.get(file_id)
    if not item:
        raise HTTPException(404, "Arquivo não encontrado")
    project = projects.get(item.projectId)
    if not project or not can_view_project(user, project):
        raise HTTPException(404, "Arquivo não encontrado")
    if user.role in {"visualizador", "auditor", "patrocinador"}:
        raise HTTPException(403, "Usuário sem permissão de edição")
    del files[file_id]
    audit(user, "excluir-arquivo", "arquivo", file_id, item.nome)


class FileShareInput(BaseModel):
    userId: str
    nivel: Literal["leitura", "edicao"]


@app.post("/api/files/{file_id}/share")
def share_file(file_id: str, payload: FileShareInput, request: Request) -> dict:
    user = current_user(request)
    item = files.get(file_id)
    if not item or not projects.get(item.projectId) or not can_view_project(user, projects[item.projectId]):
        raise HTTPException(404, "Arquivo não encontrado")
    if user.role not in {"admin", "gerente"}:
        raise HTTPException(403, "Usuário sem permissão para compartilhar")
    if payload.userId not in users:
        raise HTTPException(404, "Usuário não encontrado")
    item.compartilhamentos = [share for share in item.compartilhamentos if share.get("userId") != payload.userId]
    item.compartilhamentos.append(payload.model_dump())
    audit(user, "compartilhar-arquivo", "arquivo", file_id, payload.userId)
    return {"file": item.model_dump()}


@app.get("/api/reports")
def reports(request: Request, status_filter: str | None = Query(default=None, alias="status"), area: str | None = None, projectId: str | None = None) -> dict:
    user = current_user(request)
    visible = [p for p in projects.values() if can_view_project(user, p)]
    if status_filter and status_filter != "todos": visible = [p for p in visible if p.status == status_filter]
    if area: visible = [p for p in visible if p.areaResponsavel == area]
    if projectId: visible = [p for p in visible if p.id == projectId]
    by_status = {key: sum(p.status == key for p in visible) for key in ("ativo", "suspenso", "concluido")}
    return {"filtros": {"status": status_filter or "todos", "area": area, "projectId": projectId}, "indicadores": {"totalProjetos": len(visible), "ativos": by_status["ativo"], "suspensos": by_status["suspenso"], "concluidos": by_status["concluido"], "armazenamentoUsadoMb": sum(p.armazenamentoUsadoMb for p in visible), "totalMembros": sum(len(p.gestoresIds) + len(p.participantesIds) for p in visible), "totalMapas": sum(1 for p in visible)}, "porArea": [], "porStatus": [{"status": key, "total": value} for key, value in by_status.items()], "projetos": [{**p.model_dump(), "totalMapas": 1, "totalMembros": len(p.gestoresIds) + len(p.participantesIds)} for p in visible]}


@app.get("/api/activity-logs")
def activity_logs(request: Request, userId: str | None = None, acao: str | None = None, entidade: str | None = None, search: str | None = None) -> dict:
    require_role(current_user(request), {"admin", "auditor"})
    result = logs
    if userId: result = [item for item in result if item.userId == userId]
    if acao: result = [item for item in result if item.acao == acao]
    if entidade: result = [item for item in result if item.entidade == entidade]
    if search: result = [item for item in result if search.lower() in f"{item.acao} {item.entidade} {item.detalhes}".lower()]
    return {"logs": [{**item.model_dump(), "user": users.get(item.userId).model_dump() if users.get(item.userId) else None} for item in result]}


@app.get("/api/activity-logs/export")
def export_logs(request: Request, format: Literal["csv", "txt"] = "csv"):
    require_role(current_user(request), {"admin", "auditor"})
    if format == "txt":
        content = "\n".join(f"{item.criadoEm} | {item.userId} | {item.acao} | {item.entidade}:{item.entidadeId} | {item.detalhes}" for item in logs)
        return PlainTextResponse(content, headers={"Content-Disposition": "attachment; filename=auditoria.txt"})
    content = "data,usuario,acao,entidade,entidade_id,detalhes\n" + "\n".join(f'"{i.criadoEm}","{i.userId}","{i.acao}","{i.entidade}","{i.entidadeId}","{i.detalhes}"' for i in logs)
    return StreamingResponse(iter([content]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=auditoria.csv"})


@app.get("/api/access-map")
def access_map(request: Request) -> dict:
    user = current_user(request)
    visible = [p for p in projects.values() if can_view_project(user, p)]
    rows = []
    for project in visible:
        for member_id in project.gestoresIds + project.participantesIds:
            member = users.get(member_id)
            if member:
                rows.append({"userId": member.id, "userName": member.nome, "userEmail": str(member.email), "userRole": member.role, "area": member.area, "projectId": project.id, "projectName": project.nome, "projectStatus": project.status, "resourceId": project.id, "resourceName": project.pastaMae, "resourceType": "pasta", "accessLevel": "edicao" if member_id in project.gestoresIds else "leitura", "lastViewedAt": project.atualizadoEm})
    return {"summary": {"users": len({row["userId"] for row in rows}), "projects": len(visible), "folders": len(rows), "files": 0, "relationships": len(rows)}, "rows": rows}


@app.get("/api/users")
def list_users(request: Request) -> dict:
    require_role(current_user(request), {"admin", "patrocinador", "auditor"})
    return {"users": [user.model_dump() for user in users.values()]}


class UserRolePatch(BaseModel):
    role: Role


@app.patch("/api/users/{user_id}")
def update_user_role(user_id: str, payload: UserRolePatch, request: Request) -> dict:
    actor = current_user(request)
    require_role(actor, {"admin"})
    user = users.get(user_id)
    if not user: raise HTTPException(404, "Usuário não encontrado")
    user.role = payload.role
    audit(actor, "atualizar-papel-usuario", "usuario", user_id, payload.role)
    return {"user": user.model_dump()}


@app.get("/api/projects/{project_id}/members")
def members(project_id: str, request: Request) -> dict:
    project = projects.get(project_id)
    if not project or not can_view_project(current_user(request), project): raise HTTPException(404, "Projeto não encontrado")
    ids = project.gestoresIds + project.participantesIds
    return {"members": [{"projectId": project.id, "userId": uid, "papel": "gerente" if uid in project.gestoresIds else "participante", "adicionadoEm": project.criadoEm, "user": users[uid].model_dump()} for uid in ids if uid in users]}
