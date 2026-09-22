from pydantic import BaseModel


class ModuleOut(BaseModel):
    id: str
    nome: str
    rota: str
    icone: str
    ordem: int
    ativo: bool

    model_config = {"from_attributes": True}


class PermissionOut(BaseModel):
    id: str
    modulo_id: str
    nome: str
    descricao: str
    ativo: bool

    model_config = {"from_attributes": True}


class ProjectStatusOut(BaseModel):
    id: str
    codigo: str
    nome: str
    cor: str
    ordem: int
    ativo: bool
    permite_edicao: bool

    model_config = {"from_attributes": True}


class ProjectTypeOut(BaseModel):
    id: str
    codigo: str
    nome: str
    descricao: str
    ativo: bool

    model_config = {"from_attributes": True}


class ResponsibleAreaOut(BaseModel):
    id: str
    name: str
    prefix: str
    next_number: int
    active: bool

    model_config = {"from_attributes": True}
