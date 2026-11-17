from datetime import datetime

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    String,
    Text,
    func,
    text,
)
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


class ProjectGroup(Base):
    """Catálogo global de grupos e roles; não contém dados de projeto."""

    __tablename__ = "project_groups"
    __table_args__ = (
        Index(
            "uq_project_groups_type_identifier_ci",
            "principal_type",
            func.lower(text("identifier")),
            unique=True,
        ),
        CheckConstraint(
            "principal_type IN ('group', 'role')",
            name="ck_project_groups_principal_type",
        ),
    )

    group_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    identifier: Mapped[str] = mapped_column(String(256), nullable=False, index=True)
    group_name: Mapped[str] = mapped_column(String(256), nullable=False)
    principal_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class ProjectAccessGroup(Base):
    """Vínculo e nível de acesso de um principal dentro de um projeto."""

    __tablename__ = "project_access_groups"
    __table_args__ = (
        ForeignKeyConstraint(
            ["group_id"],
            ["project_groups.group_id"],
            ondelete="RESTRICT",
            name="fk_project_access_groups_group",
        ),
        ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            ondelete="CASCADE",
            name="fk_project_access_groups_project",
        ),
        CheckConstraint(
            "access_level IN ('leitura', 'escrita', 'administrador')",
            name="ck_project_access_groups_access_level",
        ),
    )

    project_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    group_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    access_level: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(20), default="manual", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
