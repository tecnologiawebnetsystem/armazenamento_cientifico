from pydantic import BaseModel


class AccessRequestCreate(BaseModel):
    projetoId: str
    tipo: str
    papelSolicitado: str
    justificativa: str


class AccessRequestUpdate(BaseModel):
    status: str


class SettingsUpdate(BaseModel):
    values: dict[str, str | int | bool | None]
