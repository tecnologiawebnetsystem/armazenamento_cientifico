from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

ProjectStatus = Literal["ativo", "em_implantacao", "pausado", "encerrado"]


class ProjectCreate(BaseModel):
    nome: str = Field(min_length=2, max_length=200)
    codigo: str | None = Field(default=None, max_length=50)
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
    pastaMae: str | None = None


class ProjectMemberOut(BaseModel):
    projectId: str
    userId: str
    papel: str | None = None
    adicionadoEm: datetime
    user: dict


class AccessMapGroupOut(BaseModel):
    nome: str
    fonte: str
    identificadores: list[str]
    nivel: str


class ProjectOut(BaseModel):
    id: str
    nome: str
    codigo: str
    areaResponsavel: str
    descricao: str
    status: str
    gestoresIds: list[str]
    # Nomes/identificadores corporativos dos responsáveis pela área de rede.
    responsaveis: list[str] = Field(default_factory=list)
    participantesIds: list[str]
    criadoEm: datetime
    atualizadoEm: datetime
    pastaMae: str = ""
    armazenamentoUsadoMb: float = 0


class AccessMapOut(BaseModel):
    project: ProjectOut
    projectId: str
    groups: list[AccessMapGroupOut]
    members: list[ProjectMemberOut]
    source: str
    consultedAt: datetime
    gaps: list[str] = Field(default_factory=list)


class AccessGroupCreate(BaseModel):
    """Schema para criar/associar um grupo a um projeto."""
    groupName: str = Field(min_length=1, max_length=256)
    groupId: str = Field(min_length=1, max_length=36)
    accessLevel: str = Field(min_length=1, max_length=40)


class AccessGroupPatch(BaseModel):
    """Schema para atualizar apenas o nível de acesso de um grupo vinculado."""
    accessLevel: str = Field(min_length=1, max_length=40)


class AccessGroupOut(BaseModel):
    """Schema de saída para um grupo de acesso vinculado ao projeto."""
    id: str
    projectId: str
    groupName: str
    groupId: str
    accessLevel: str
    source: str
    createdAt: datetime
    updatedAt: datetime


class ProjectAccessGroupsOut(BaseModel):
    """Resposta paginada com grupos de acesso de um projeto."""
    projectId: str
    projectName: str
    groups: list[AccessGroupOut]
    total: int
