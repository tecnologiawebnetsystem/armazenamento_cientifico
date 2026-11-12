from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class RitmStatusUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["Concluído"]


class RitmStatusUpdateResponse(BaseModel):
    status: Literal["Concluído"]
    updatedAt: str = Field(min_length=1)
    message: str = Field(min_length=1)
