"""Modelos ORM dos catálogos do sistema.

Consolidado a partir de:
- authorization_models.py (Permission, ProfilePermission, ProfileModule)
- navigation_models.py (Module, MenuItem, MenuPermission, DashboardCard)
- project_catalog_models.py (ResponsibleArea, ProjectStatus)
- reporting_models.py (ReportType, ReportField)
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

# ── Autorização ──────────────────────────────────────────────────────

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


# ── Navegação ────────────────────────────────────────────────────────

class Module(Base):
    __tablename__ = "modules"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    name: Mapped[str] = mapped_column("name", String(120), nullable=False, unique=True)
    route: Mapped[str] = mapped_column("route", String(180), default="", nullable=False)
    icon: Mapped[str] = mapped_column("icon", String(80), default="folder", nullable=False)
    display_order: Mapped[int] = mapped_column("display_order", Integer, default=0, nullable=False)
    active: Mapped[bool] = mapped_column("active", Boolean, default=True, nullable=False)


class MenuItem(Base):
    __tablename__ = "menus"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    module_id: Mapped[str | None] = mapped_column("module_id", ForeignKey("modules.id", ondelete="SET NULL"), nullable=True)
    parent_id: Mapped[str | None] = mapped_column(String(80), ForeignKey("menus.id", ondelete="SET NULL"), nullable=True)
    name: Mapped[str] = mapped_column("name", String(120), nullable=False)
    route: Mapped[str] = mapped_column("route", String(180), default="", nullable=False)
    icon: Mapped[str] = mapped_column("icon", String(80), default="circle", nullable=False)
    display_order: Mapped[int] = mapped_column("display_order", Integer, default=0, nullable=False)
    active: Mapped[bool] = mapped_column("active", Boolean, default=True, nullable=False)


class MenuPermission(Base):
    __tablename__ = "menu_permissions"

    menu_id: Mapped[str] = mapped_column("menu_id", ForeignKey("menus.id", ondelete="CASCADE"), primary_key=True)
    permission_id: Mapped[str] = mapped_column("permission_id", ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True)
    allowed: Mapped[bool] = mapped_column("allowed", Boolean, default=True, nullable=False)


class DashboardCard(Base):
    __tablename__ = "dashboard_cards"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    module_id: Mapped[str | None] = mapped_column("module_id", ForeignKey("modules.id", ondelete="SET NULL"), nullable=True)
    key: Mapped[str] = mapped_column("key", String(80), unique=True, nullable=False)
    title: Mapped[str] = mapped_column("title", String(140), nullable=False)
    description: Mapped[str] = mapped_column("description", Text, default="", nullable=False)
    metric_key: Mapped[str] = mapped_column("metric_key", String(80), nullable=False)
    route: Mapped[str] = mapped_column("route", String(180), default="", nullable=False)
    profile_ids: Mapped[str] = mapped_column("profile_ids", Text, default="", nullable=False)
    display_order: Mapped[int] = mapped_column("display_order", Integer, default=0, nullable=False)
    active: Mapped[bool] = mapped_column("active", Boolean, default=True, nullable=False)


# ── Catálogos de projeto ─────────────────────────────────────────────

class ResponsibleArea(Base):
    __tablename__ = "responsible_areas"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    prefix: Mapped[str] = mapped_column(String(20), unique=True)
    next_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    active: Mapped[bool] = mapped_column(default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    def preview_code(self) -> str:
        return f"{self.prefix}-{self.next_number:04d}"

    def consume_code(self) -> str:
        code = self.preview_code()
        self.next_number += 1
        return code


class ProjectStatus(Base):
    __tablename__ = "project_statuses"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    code: Mapped[str] = mapped_column("code", String(40), unique=True, nullable=False)
    name: Mapped[str] = mapped_column("name", String(100), nullable=False)
    color: Mapped[str] = mapped_column("color", String(20), default="slate", nullable=False)
    display_order: Mapped[int] = mapped_column("display_order", Integer, default=0, nullable=False)
    active: Mapped[bool] = mapped_column("active", Boolean, default=True, nullable=False)
    allows_edit: Mapped[bool] = mapped_column("allows_edit", Boolean, default=True, nullable=False)


# ── Relatórios ───────────────────────────────────────────────────────

class ReportType(Base):
    __tablename__ = "report_types"

    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    code: Mapped[str] = mapped_column("code", String(60), unique=True, nullable=False)
    name: Mapped[str] = mapped_column("name", String(120), nullable=False)
    description: Mapped[str] = mapped_column("description", Text, default="", nullable=False)
    formats: Mapped[str] = mapped_column("formats", Text, default="csv", nullable=False)
    active: Mapped[bool] = mapped_column("active", Boolean, default=True, nullable=False)


class ReportField(Base):
    __tablename__ = "report_fields"

    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    report_code: Mapped[str] = mapped_column(String(60), ForeignKey("report_types.code", ondelete="CASCADE"), nullable=False, index=True)
    field_key: Mapped[str] = mapped_column(String(100), nullable=False)
    label: Mapped[str] = mapped_column(String(160), nullable=False)
    source_key: Mapped[str] = mapped_column(String(160), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)