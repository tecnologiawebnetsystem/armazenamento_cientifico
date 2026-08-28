from datetime import datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class FilePermission(Base):
    """Permissão direta por arquivo; compartilhamento por arquivo não é usado na UI."""

    __tablename__ = "file_permissions"

    file_id: Mapped[str] = mapped_column(ForeignKey("files.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, nullable=True)
    group_id: Mapped[str | None] = mapped_column(String(36), primary_key=True, nullable=True)
    level: Mapped[str] = mapped_column(String(20), nullable=False)
    inherited_from: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(nullable=False)


__all__ = ["FilePermission"]
