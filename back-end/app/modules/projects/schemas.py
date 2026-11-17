from datetime import datetime
from typing import Literal

from pydantic import AliasChoices, BaseModel, Field

ProjectStatus = Literal["ativo", "em_implantacao", "pausado", "encerrado"]


PrincipalType = Literal["group", "role"]
AccessLevel = Literal["leitura", "escrita", "administrador"]


class AccessGroupCreate(BaseModel):
    """Schema para associar um grupo ou role a um projeto."""

    groupName: str = Field(min_length=1, max_length=256)
    identifier: str = Field(
        min_length=1,
        max_length=256,
        validation_alias=AliasChoices("identifier", "groupId"),
    )
    principalType: PrincipalType = "group"
    accessLevel: AccessLevel


class ProjectCreate(BaseModel):
    nome: str = Field(min_length=2, max_length=200)
    gruposAcesso: list["AccessGroupCreate"] = Field(default_factory=list)
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
    principalType: PrincipalType = "group"


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


class AccessGroupPatch(BaseModel):
    """Campos editáveis de um principal vinculado ao projeto."""

    groupName: str | None = Field(default=None, min_length=1, max_length=256)
    identifier: str | None = Field(default=None, min_length=1, max_length=256)
    principalType: PrincipalType | None = None
    accessLevel: AccessLevel | None = None


class AccessGroupOut(BaseModel):
    """Schema de saída para um principal de acesso vinculado ao projeto."""

    id: str
    projectId: str
    groupName: str
    identifier: str
    groupId: str
    principalType: PrincipalType
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


class ProjectGroupCatalogOut(BaseModel):
    id: str
    identifier: str
    groupName: str
    principalType: PrincipalType
