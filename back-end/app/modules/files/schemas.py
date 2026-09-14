from pydantic import BaseModel


class FolderOut(BaseModel):
    id: str
    project_id: str
    parent_id: str | None
    kind: str
    name: str
    size_bytes: int
    mime_type: str | None
    created_by: str

    model_config = {"from_attributes": True}


class FolderListOut(BaseModel):
    folders: list[FolderOut]

    model_config = {"from_attributes": True}
