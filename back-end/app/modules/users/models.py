from datetime import datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.modules.users.profile_model import Profile

__all__ = ["Profile", "User"]


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    job_title: Mapped[str | None] = mapped_column("job_title", String(120), nullable=True)
    area: Mapped[str | None] = mapped_column(String(120), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(nullable=True)
    role: Mapped[str] = mapped_column(String(40), default="solicitante")
    profile_id: Mapped[str | None] = mapped_column("profile_id", ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(nullable=False)
