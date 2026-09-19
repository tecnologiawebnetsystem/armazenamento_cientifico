"""Registro único dos modelos persistidos do SiGAC.

Importar este módulo garante que todos os modelos estejam registrados em
``Base.metadata`` antes de o Alembic comparar ou gerar migrations.
"""

from datetime import datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.modules.audit.models import ActivityLog
from app.modules.catalogs.area_model import ResponsibleArea
from app.modules.catalogs.models import (
    DashboardCard,
    MenuItem,
    MenuPermission,
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
    request_type: Mapped[str] = mapped_column(String(40), nullable=False, default="geral")
    requested_role: Mapped[str] = mapped_column(String(40), nullable=False, default="")
    justification: Mapped[str] = mapped_column(String(2000), nullable=False, default="")
    servicenow_ticket: Mapped[str | None] = mapped_column(String(120), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(nullable=False)
    analyzed_by: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(nullable=False)

__all__ = [
    "AccessRequest", "ActivityLog", "DashboardCard", "Folder", "MenuItem", "MenuPermission", "Module", "Perfil",
    "Permission", "ProfileModule", "ProfilePermission",
    "Project", "ProjectMember", "ProjectStatusCatalog", "ProjectType",
    "ReportField", "ReportType", "ResponsibleArea", "SystemSetting", "User",
]

# Evita que linters removam os imports que registram as classes no metadata.
_ORM_MODELS = (
    AccessRequest, ActivityLog, DashboardCard, Folder, MenuItem, MenuPermission, Module, Perfil, Permission,
    ProfileModule, ProfilePermission, Project, ProjectMember,
    ProjectStatusCatalog, ProjectType, ReportField, ReportType, ResponsibleArea,
    SystemSetting, User,
)

# A tupla mantém referências aos modelos importados para o carregamento do metadata.
