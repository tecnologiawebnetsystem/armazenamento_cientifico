from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(String(20), primary_key=True)
    name: Mapped[str] = mapped_column("name", String(80), unique=True, nullable=False)
    role: Mapped[str] = mapped_column("role", String(40), nullable=False, default="")
    description: Mapped[str] = mapped_column("description", String(255), default="")
    created_at: Mapped[datetime] = mapped_column("created_at", DateTime(timezone=True), nullable=False)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    profile_id: Mapped[str | None] = mapped_column("profile_id", ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True, index=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
