from pydantic import BaseModel, Field


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
