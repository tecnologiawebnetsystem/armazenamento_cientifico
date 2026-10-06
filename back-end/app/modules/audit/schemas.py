from datetime import datetime

from pydantic import BaseModel, Field


class ActivityLogPage(BaseModel):
    items: list["ActivityLogOut"]
    page: int
    limit: int
    total: int
    total_pages: int


class ActivityLogIn(BaseModel):
    action: str = Field(min_length=1, max_length=100)
    entity: str = Field(default="interface", min_length=1, max_length=100)
    entity_id: str | None = Field(default=None, max_length=100)
    details: dict[str, object] = Field(default_factory=dict)
    result: str = Field(default="sucesso", max_length=30)


class ActivityLogOut(BaseModel):
    id: str
    user_id: str | None
    user_name: str | None = None
    user_email: str | None = None
    action: str
    entity: str
    entity_id: str | None
    details: str
    result: str
    correlation_id: str | None
    http_method: str | None
    route: str | None
    duration_ms: float | None
    ip_address: str | None
    project_id: str | None
    created_at: datetime
    model_config = {"from_attributes": True}
