from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

ProjectStatus = Literal["ativo", "concluido", "suspenso"]


class ProjectCreate(BaseModel):
    nome: str = Field(min_length=2, max_length=200)
    codigo: str = Field(min_length=1, max_length=50)
    areaResponsavel: str = Field(min_length=1, max_length=160)
    gestoresIds: list[str] = Field(default_factory=list)
    descricao: str = ""
    status: ProjectStatus = "ativo"
    participantesIds: list[str] = Field(default_factory=list)
    grupoAdEscrita: str = ""
    grupoAdLeitura: str = ""
    roleIdentidadeEscrita: str = ""
    roleIdentidadeLeitura: str = ""
    numeroTarefaSnow: str = ""
    pastaMae: str = ""


class ProjectPatch(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=200)
    areaResponsavel: str | None = Field(default=None, min_length=1, max_length=160)
    descricao: str | None = None
    status: ProjectStatus | None = None
    grupoAdEscrita: str | None = None
    grupoAdLeitura: str | None = None
    roleIdentidadeEscrita: str | None = None
    roleIdentidadeLeitura: str | None = None


class ProjectMemberOut(BaseModel):
    projectId: str
    userId: str
    papel: str
    adicionadoEm: datetime
    user: dict


class AccessMapGroupOut(BaseModel):
    nome: str
    fonte: str
    identificadores: list[str]
    nivel: str


class AccessMapOut(BaseModel):
    projectId: str
    groups: list[AccessMapGroupOut]
    members: list[ProjectMemberOut]
    source: str
    consultedAt: datetime
    gaps: list[str] = Field(default_factory=list)


class ProjectOut(BaseModel):
    id: str
    nome: str
    codigo: str
    areaResponsavel: str
    descricao: str
    status: str
    gestoresIds: list[str]
    participantesIds: list[str]
    criadoEm: datetime
    atualizadoEm: datetime
