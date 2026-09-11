from datetime import datetime

from sqlalchemy import Integer, String
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


__all__ = ["ResponsibleArea"]
