from datetime import datetime
from typing import Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, EmailStr, Field


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    nome: str = Field(validation_alias=AliasChoices("nome", "name"), serialization_alias="nome")
    email: EmailStr
    cargo: str | None = Field(
        default=None,
        validation_alias=AliasChoices("cargo", "job_title"),
        serialization_alias="cargo",
    )
    area: str | None = None
    role: str
    perfil_id: str | None = None
    criadoEm: datetime = Field(
        validation_alias=AliasChoices("criadoEm", "created_at"), serialization_alias="criadoEm"
    )


class UserRoleUpdate(BaseModel):
    role: Literal[
        "admin", "gerente", "patrocinador", "auditor", "solicitante", "gestor", "participante", "visualizador"
    ]
    perfil_id: str | None = None
