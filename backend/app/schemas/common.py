from typing import Literal

from pydantic import BaseModel, EmailStr, Field

Role = Literal[
    "admin", "gerente", "patrocinador", "auditor", "participante", "visualizador", "gestor"
]
ProjectStatus = Literal["ativo", "concluido", "suspenso"]


class LoginRequest(BaseModel):
    email: EmailStr


class ProjectCreate(BaseModel):
    nome: str = Field(min_length=2, max_length=200)
    codigo: str = Field(min_length=1, max_length=50)
    criadoEm: str | None = None
    areaResponsavel: str = Field(min_length=1, max_length=150)
    gestoresIds: list[str] = Field(default_factory=list)
    grupoAdEscrita: str = ""
    grupoAdLeitura: str = ""
    roleIdentidadeEscrita: str = ""
    roleIdentidadeLeitura: str = ""
    numeroTarefaSnow: str = ""
    pastaMae: str = ""
    descricao: str = ""
    status: ProjectStatus = "ativo"
    participantesIds: list[str] = Field(default_factory=list)


class ProjectPatch(BaseModel):
    nome: str | None = None
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


class FileCreate(BaseModel):
    projectId: str
    parentId: str | None = None
    tipo: Literal["pasta", "arquivo"]
    nome: str = Field(min_length=1, max_length=500)
    tamanho: int = Field(default=0, ge=0)
    mimeType: str | None = None


class FilePatch(BaseModel):
    nome: str | None = None
    parentId: str | None = None


class MemberRequest(BaseModel):
    userId: str
    papel: Literal["gerente", "participante", "visualizador"]


class ShareRequest(BaseModel):
    userId: str
    nivel: Literal["leitura", "edicao"]


class RoleRequest(BaseModel):
    role: Role
