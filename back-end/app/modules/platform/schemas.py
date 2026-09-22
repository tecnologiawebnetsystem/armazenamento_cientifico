from pydantic import BaseModel


class AccessRequestCreate(BaseModel):
    projetoId: str
    tipo: str
    papelSolicitado: str
    justificativa: str


class AccessRequestUpdate(BaseModel):
    status: str
