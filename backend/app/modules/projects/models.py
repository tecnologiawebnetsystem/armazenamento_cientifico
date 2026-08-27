from datetime import datetime

from sqlalchemy import JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    responsible_area: Mapped[str] = mapped_column(String(160))
    managers_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    write_group: Mapped[str] = mapped_column(String(160), default="")
    read_group: Mapped[str] = mapped_column(String(160), default="")
    write_identity_role: Mapped[str] = mapped_column(String(160), default="")
    read_identity_role: Mapped[str] = mapped_column(String(160), default="")
    snow_task_number: Mapped[str] = mapped_column(String(120), default="")
    parent_folder: Mapped[str] = mapped_column(String(500), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(30), default="ativo", index=True)
    participants_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(nullable=False)
    updated_at: Mapped[datetime] = mapped_column(nullable=False)
