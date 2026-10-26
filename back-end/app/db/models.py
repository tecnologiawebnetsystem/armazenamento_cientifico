"""Registro único dos modelos persistidos do SiGAC.

Importar este módulo garante que todos os modelos estejam registrados em
``Base.metadata`` antes de o Alembic comparar ou gerar migrations.
"""

from app.modules.audit.models import ActivityLog
from app.modules.auth.models import UserSession
from app.modules.catalogs.models import (
    DashboardCard,
    MenuItem,
    MenuPermission,
    Module,
    Permission,
    ProfileModule,
    ProfilePermission,
    ProjectStatus,
    ReportField,
    ReportType,
    ResponsibleArea,
)
from app.modules.folders.models import Folder
from app.modules.projects.models import Project, ProjectMember
from app.modules.users.models import Profile, User

__all__ = [
    "ActivityLog",
    "DashboardCard",
    "Folder",
    "MenuItem",
    "MenuPermission",
    "Module",
    "Permission",
    "Profile",
    "ProfileModule",
    "ProfilePermission",
    "Project",
    "ProjectMember",
    "ProjectStatus",
    "ReportField",
    "ReportType",
    "ResponsibleArea",
    "User",
    "UserSession",
]

# Evita que linters removam os imports que registram as classes no metadata.
_ORM_MODELS = (
    ActivityLog, DashboardCard, Folder, MenuItem, MenuPermission, Module, Profile, Permission,
    ProfileModule, ProfilePermission, Project, ProjectMember,
    ProjectStatus, ReportField, ReportType, ResponsibleArea,
    User, UserSession,
)

# A tupla mantém referências aos modelos importados para o carregamento do metadata.
