"""Sessão de autenticação (login local ou CAV4)."""

from datetime import datetime

from sqlalchemy import JSON, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserSession(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    profile_id: Mapped[str | None] = mapped_column(String(20), ForeignKey("profiles.id", ondelete="RESTRICT"), nullable=True)
    profile_data: Mapped[dict | None] = mapped_column(JSON().with_variant(JSONB(), "postgresql"), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.current_timestamp())


__all__ = ["UserSession"]
