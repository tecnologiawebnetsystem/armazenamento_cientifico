from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    cargo: str | None = Field(None, max_length=120)
    area: str | None = Field(None, max_length=120)
    avatar_url: str | None = Field(None, max_length=500)
    role: str = Field("participante", max_length=40)
    perfil_id: str | None = Field(None, max_length=36)


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    cargo: str | None = Field(None, max_length=120)
    area: str | None = Field(None, max_length=120)
    avatar_url: str | None = Field(None, max_length=500)
    role: str | None = Field(None, max_length=40)
    perfil_id: str | None = Field(None, max_length=36)


class UserOut(UserBase):
    id: str
    last_login_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PerfilBase(BaseModel):
    nome: str = Field(..., min_length=1, max_length=80)
    descricao: str | None = Field(None, max_length=500)


class PerfilCreate(PerfilBase):
    pass


class PerfilOut(PerfilBase):
    id: str
    criado_em: datetime

    model_config = {"from_attributes": True}
