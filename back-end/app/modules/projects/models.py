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
    UniqueConstraint,
    func,
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
    """Grupo ou role configurado para um projeto, incluindo seu nível de acesso."""

    __tablename__ = "project_groups"
    __table_args__ = (
        CheckConstraint(
            "principal_type IN ('group', 'role')",
            name="ck_project_groups_principal_type",
        ),
        CheckConstraint(
            "access_level IN ('leitura', 'escrita', 'administrador')",
            name="ck_project_groups_access_level",
        ),
        ForeignKeyConstraint(
            ["project_id"], ["projects.id"], ondelete="CASCADE"
        ),
        UniqueConstraint(
            "project_id",
            "principal_type",
            "identifier",
            name="uq_project_groups_project_type_identifier",
        ),
        UniqueConstraint(
            "project_id", "group_id", name="uq_project_groups_project_group"
        ),
        Index("ix_project_groups_project_id", "project_id"),
        Index("ix_project_groups_access_level", "access_level"),
    )

    group_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    identifier: Mapped[str] = mapped_column(String(256), nullable=False)
    group_name: Mapped[str] = mapped_column(String(256), nullable=False)
    principal_type: Mapped[str] = mapped_column(String(20), nullable=False)
    access_level: Mapped[str] = mapped_column(String(40), nullable=False)
    source: Mapped[str] = mapped_column(
        String(20), default="manual", server_default="manual", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class ProjectAccessGroup(Base):
    """Vínculo entre o projeto e seu principal de acesso."""

    __tablename__ = "project_access_groups"
    __table_args__ = (
        ForeignKeyConstraint(
            ["project_id", "group_id"],
            ["project_groups.project_id", "project_groups.group_id"],
            ondelete="CASCADE",
            name="fk_project_access_groups_project_group",
        ),
    )

    project_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    group_id: Mapped[str] = mapped_column(String(36), primary_key=True)
