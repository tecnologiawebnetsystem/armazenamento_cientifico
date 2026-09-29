from datetime import datetime

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(String(20), primary_key=True)
    name: Mapped[str] = mapped_column("name", String(80), unique=True, nullable=False)
    description: Mapped[str] = mapped_column("description", String(255), default="")
    created_at: Mapped[datetime] = mapped_column("created_at", nullable=False)
