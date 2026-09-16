"""Registro único dos modelos persistidos do SiGAC.

Importar este módulo garante que todos os modelos estejam registrados em
``Base.metadata`` antes de o Alembic comparar ou gerar migrations.
"""

from datetime import datetime

from sqlalchemy import JSON, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.modules.audit.models import ActivityLog
from app.modules.catalogs.area_model import ResponsibleArea
from app.modules.catalogs.models import (
    MenuItem,
    Module,
    Permission,
    ProfileModule,
    ProfilePermission,
    ProjectStatusCatalog,
    ProjectType,
    ReportField,
    ReportType,
    SystemSetting,
)
from app.modules.files.models import Folder
from app.modules.projects.member_model import ProjectMember
from app.modules.projects.models import Project
from app.modules.users.models import User
from app.modules.users.profile_model import Perfil


class AccessRequest(Base):
    __tablename__ = "access_requests"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    requester_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    created_at: Mapped[datetime] = mapped_column(nullable=False)


class PermissionMatrix(Base):
    __tablename__ = "permission_matrix"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    matrix: Mapped[dict] = mapped_column(JSON, nullable=False)


__all__ = [
    "AccessRequest", "ActivityLog", "Folder", "MenuItem", "Module", "Perfil",
    "Permission", "PermissionMatrix", "ProfileModule", "ProfilePermission",
    "Project", "ProjectMember", "ProjectStatusCatalog", "ProjectType",
    "ReportField", "ReportType", "ResponsibleArea", "SystemSetting", "User",
]

# Evita que linters removam os imports que registram as classes no metadata.
_ORM_MODELS = (
    AccessRequest, ActivityLog, Folder, MenuItem, Module, Perfil, Permission,
    PermissionMatrix, ProfileModule, ProfilePermission, Project, ProjectMember,
    ProjectStatusCatalog, ProjectType, ReportField, ReportType, ResponsibleArea,
    SystemSetting, User,
)

# A tupla mantém referências aos modelos importados para o carregamento do metadata.
