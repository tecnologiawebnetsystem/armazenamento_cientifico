from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Permission(Base):
    __tablename__ = "permissions"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    module_id: Mapped[str] = mapped_column("module_id", ForeignKey("modules.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column("name", String(120), nullable=False)
    description: Mapped[str] = mapped_column("description", Text, default="", nullable=False)
    active: Mapped[bool] = mapped_column("active", Boolean, default=True, nullable=False)


class ProfilePermission(Base):
    __tablename__ = "profile_permissions"

    profile_id: Mapped[str] = mapped_column("profile_id", ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True)
    permission_id: Mapped[str] = mapped_column("permission_id", ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True)
    allowed: Mapped[bool] = mapped_column("allowed", Boolean, default=True, nullable=False)


class ProfileModule(Base):
    __tablename__ = "profile_modules"

    profile_id: Mapped[str] = mapped_column("profile_id", ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True)
    module_id: Mapped[str] = mapped_column("module_id", ForeignKey("modules.id", ondelete="CASCADE"), primary_key=True)
    can_view: Mapped[bool] = mapped_column("can_view", Boolean, default=True, nullable=False)
