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


class FolderListOut(BaseModel):
    folders: list[FolderOut]

    model_config = {"from_attributes": True}


class FolderSyncOut(FolderListOut):
    added: int = 0
    updated: int = 0
    removed: int = 0
    synchronized_at: datetime


class FolderPermissionOut(BaseModel):
    identity: str
    access_type: str
    rights: list[str]
    inherited: bool
    inheritance_flags: list[str] = Field(default_factory=list)
    propagation_flags: list[str] = Field(default_factory=list)


class FolderPermissionsOut(BaseModel):
    folder_id: str
    folder_name: str
    permissions: list[FolderPermissionOut]
    source: str
    consulted_at: datetime
