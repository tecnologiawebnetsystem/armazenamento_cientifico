"""Registro único dos modelos persistidos do SiGAC.

Importar este módulo garante que todos os modelos estejam registrados em
``Base.metadata`` antes de o Alembic comparar ou gerar migrations.
"""

from app.db.base import Base
from app.modules.audit.models import ActivityLog
from app.modules.auth.models import UserSession
from app.modules.catalogs.authorization_models import Permission, ProfileModule, ProfilePermission
from app.modules.catalogs.navigation_models import DashboardCard, MenuItem, MenuPermission, Module
from app.modules.catalogs.project_catalog_models import ProjectStatus, ResponsibleArea
from app.modules.catalogs.reporting_models import ReportField, ReportType
from app.modules.files.models import Folder
from app.modules.projects.member_model import ProjectMember
from app.modules.projects.models import Project
from app.modules.users.models import User
from app.modules.users.profile_model import Profile

__all__ = [
    "ActivityLog", "DashboardCard", "Folder", "MenuItem", "MenuPermission", "Module", "Profile",
    "Permission", "ProfileModule", "ProfilePermission",
    "Project", "ProjectMember", "ProjectStatus",
    "ReportField", "ReportType", "ResponsibleArea", "User", "UserSession",
]

# Evita que linters removam os imports que registram as classes no metadata.
_ORM_MODELS = (
    ActivityLog, DashboardCard, Folder, MenuItem, MenuPermission, Module, Profile, Permission,
    ProfileModule, ProfilePermission, Project, ProjectMember,
    ProjectStatus, ReportField, ReportType, ResponsibleArea,
    User, UserSession,
)

# A tupla mantém referências aos modelos importados para o carregamento do metadata.
