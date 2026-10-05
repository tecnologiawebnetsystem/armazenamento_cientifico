from datetime import datetime

from pydantic import BaseModel, Field


class UserBase(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=80)
    perfil_id: str | None = Field(None, max_length=20)


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


class ProfileBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    description: str | None = Field(None, max_length=500)


class ProfileCreate(ProfileBase):
    pass


class ProfileOut(ProfileBase):
    id: str
    created_at: datetime

    model_config = {"from_attributes": True}
