from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    responsible_area: Mapped[str] = mapped_column(String(160))
    managers_ids: Mapped[list[str]] = mapped_column(JSON().with_variant(JSONB(), "postgresql"), default=list)
    write_group: Mapped[str] = mapped_column(String(160), default="")
    read_group: Mapped[str] = mapped_column(String(160), default="")
    write_identity_role: Mapped[str] = mapped_column(String(160), default="")
    read_identity_role: Mapped[str] = mapped_column(String(160), default="")
    snow_task_number: Mapped[str] = mapped_column(String(120), default="")
    parent_folder: Mapped[str] = mapped_column(String(500), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(30), default="ativo", index=True)
    participants_ids: Mapped[list[str]] = mapped_column(JSON().with_variant(JSONB(), "postgresql"), default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class ProjectMember(Base):
    """Relação persistida entre um projeto e um usuário com seu papel."""

    __tablename__ = "project_members"

    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String(255), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role: Mapped[str | None] = mapped_column("role", String(40), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class ProjectAccessGroup(Base):
    """Grupo/perfil do Entra ID associado a um projeto, com nível de acesso categorizado."""

    __tablename__ = "project_access_groups"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    group_name: Mapped[str] = mapped_column(String(256), nullable=False)
    group_id: Mapped[str] = mapped_column(String(36), nullable=False)
    access_level: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(20), default="manual")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
