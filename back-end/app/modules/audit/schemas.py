from datetime import datetime

from pydantic import BaseModel, Field


class ActivityLogIn(BaseModel):
    action: str = Field(min_length=1, max_length=100)
    entity: str = Field(default="interface", min_length=1, max_length=100)
    entity_id: str | None = Field(default=None, max_length=100)
    details: dict[str, object] = Field(default_factory=dict)
    result: str = Field(default="sucesso", max_length=30)


class ActivityLogOut(BaseModel):
    id: str
    user_id: str
    action: str
    entity: str
    entity_id: str | None
    details: str
    created_at: datetime
    model_config = {"from_attributes": True}
