from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


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
    parent_id: Mapped[str | None] = mapped_column(ForeignKey("menus.id", ondelete="SET NULL"), String(80), nullable=True)
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
