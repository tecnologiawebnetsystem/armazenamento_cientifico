"""Registro único dos modelos persistidos do SiGAC.

Importar este módulo garante que todos os modelos estejam registrados em
``Base.metadata`` antes de o Alembic comparar ou gerar migrations.
"""

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
)
from app.modules.files.models import Folder
from app.modules.projects.member_model import ProjectMember
from app.modules.projects.models import Project
from app.modules.users.models import User
from app.modules.users.profile_model import Perfil

__all__ = [
    "ActivityLog", "DashboardCard", "Folder", "MenuItem", "MenuPermission", "Module", "Perfil",
    "Permission", "ProfileModule", "ProfilePermission",
    "Project", "ProjectMember", "ProjectStatusCatalog", "ProjectType",
    "ReportField", "ReportType", "ResponsibleArea", "User",
]

# Evita que linters removam os imports que registram as classes no metadata.
_ORM_MODELS = (
    ActivityLog, DashboardCard, Folder, MenuItem, MenuPermission, Module, Perfil, Permission,
    ProfileModule, ProfilePermission, Project, ProjectMember,
    ProjectStatusCatalog, ProjectType, ReportField, ReportType, ResponsibleArea,
    User,
)

# A tupla mantém referências aos modelos importados para o carregamento do metadata.
