from datetime import datetime

from sqlalchemy import ForeignKey, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.modules.users.profile_model import Profile

__all__ = ["Profile", "User"]


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, server_default=text("md5(gen_random_uuid()::text)"))
    user_id: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    profile_id: Mapped[str | None] = mapped_column("profile_id", ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True, index=True)
    last_login_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(nullable=False)
