from typing import Literal

from pydantic import BaseModel, Field


class FileCreate(BaseModel):
    project_id: str
    parent_id: str | None = None
    kind: Literal["pasta", "arquivo"]
    name: str = Field(min_length=1, max_length=500)
    size_bytes: int = Field(default=0, ge=0)
    mime_type: str | None = None


class FileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=500)
    parent_id: str | None = None


class FilePermissionCreate(BaseModel):
    user_id: str | None = None
    group_id: str | None = None
    level: str = Field(min_length=1, max_length=20)


class FilePermissionOut(BaseModel):
    file_id: str
    user_id: str | None
    group_id: str | None
    level: str
    inherited_from: str | None

    model_config = {"from_attributes": True}


class FileOut(BaseModel):
    id: str
    project_id: str
    parent_id: str | None
    kind: str
    name: str
    size_bytes: int
    mime_type: str | None
    created_by: str

    model_config = {"from_attributes": True}


class FileListOut(BaseModel):
    files: list[FileOut]
    breadcrumb: list[dict] = Field(default_factory=list)
