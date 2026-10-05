from datetime import datetime

from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ResponsibleArea(Base):
    __tablename__ = "responsible_areas"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    prefix: Mapped[str] = mapped_column(String(20), unique=True)
    next_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    active: Mapped[bool] = mapped_column(default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(nullable=False)
    updated_at: Mapped[datetime] = mapped_column(nullable=False)

    def preview_code(self) -> str:
        return f"{self.prefix}-{self.next_number:04d}"

    def consume_code(self) -> str:
        code = self.preview_code()
        self.next_number += 1
        return code


class ProjectStatus(Base):
    __tablename__ = "project_statuses"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    code: Mapped[str] = mapped_column("code", String(40), unique=True, nullable=False)
    name: Mapped[str] = mapped_column("nome", String(100), nullable=False)
    color: Mapped[str] = mapped_column("color", String(20), default="slate", nullable=False)
    display_order: Mapped[int] = mapped_column("display_order", Integer, default=0, nullable=False)
    active: Mapped[bool] = mapped_column("active", Boolean, default=True, nullable=False)
    allows_edit: Mapped[bool] = mapped_column("allows_edit", Boolean, default=True, nullable=False)
