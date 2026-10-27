from datetime import datetime

from pydantic import BaseModel, Field


class FolderBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=500)
    project_id: str = Field(..., max_length=36)
    parent_id: str | None = Field(None, max_length=36)
    kind: str = Field("pasta", max_length=20)
    mime_type: str | None = Field(None, max_length=160)


class FolderCreate(FolderBase):
    created_by: str | None = Field(None, max_length=36)


class FolderOut(FolderBase):
    id: str
    size_bytes: int = Field(validation_alias="size", serialization_alias="size_bytes")
    created_by: str | None = Field(None, max_length=36)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FolderSyncItem(BaseModel):
    id: str | None = Field(None, max_length=36)
    name: str = Field(..., min_length=1, max_length=500)
    parent_id: str | None = Field(None, max_length=36)
    kind: str = Field("pasta", max_length=20)
    size_bytes: int = Field(0, ge=0)


class FolderSyncIn(BaseModel):
    folders: list[FolderSyncItem] = Field(default_factory=list, max_length=10000)


class FolderListOut(BaseModel):
    folders: list[FolderOut]
    source: str = "tabela"

    model_config = {"from_attributes": True}
