
from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Permission(Base):
    __tablename__ = "permissions"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    modulo_id: Mapped[str] = mapped_column("module_id", ForeignKey("modules.id", ondelete="CASCADE"), nullable=False, index=True)
    nome: Mapped[str] = mapped_column("name", String(120), nullable=False)
    descricao: Mapped[str] = mapped_column("description", Text, default="", nullable=False)
    ativo: Mapped[bool] = mapped_column("active", Boolean, default=True, nullable=False)


class ProfilePermission(Base):
    __tablename__ = "profile_permissions"
    perfil_id: Mapped[str] = mapped_column("profile_id", ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True)
    permissao_id: Mapped[str] = mapped_column("permission_id", ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True)
    permitido: Mapped[bool] = mapped_column("allowed", Boolean, default=True, nullable=False)


class Module(Base):
    __tablename__ = "modules"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    nome: Mapped[str] = mapped_column("name", String(120), nullable=False, unique=True)
    rota: Mapped[str] = mapped_column("route", String(180), default="", nullable=False)
    icone: Mapped[str] = mapped_column("icon", String(80), default="folder", nullable=False)
    ordem: Mapped[int] = mapped_column("display_order", Integer, default=0, nullable=False)
    ativo: Mapped[bool] = mapped_column("active", Boolean, default=True, nullable=False)


class ProfileModule(Base):
    __tablename__ = "profile_modules"
    perfil_id: Mapped[str] = mapped_column("profile_id", ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True)
    modulo_id: Mapped[str] = mapped_column("module_id", ForeignKey("modules.id", ondelete="CASCADE"), primary_key=True)
    pode_visualizar: Mapped[bool] = mapped_column("can_view", Boolean, default=True, nullable=False)


class ProjectStatusCatalog(Base):
    __tablename__ = "project_statuses"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    codigo: Mapped[str] = mapped_column("code", String(40), unique=True, nullable=False)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    cor: Mapped[str] = mapped_column("color", String(20), default="slate", nullable=False)
    ordem: Mapped[int] = mapped_column("display_order", Integer, default=0, nullable=False)
    ativo: Mapped[bool] = mapped_column("active", Boolean, default=True, nullable=False)
    permite_edicao: Mapped[bool] = mapped_column("allows_edit", Boolean, default=True, nullable=False)


class ProjectType(Base):
    __tablename__ = "project_types"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    codigo: Mapped[str] = mapped_column("code", String(40), unique=True, nullable=False)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    descricao: Mapped[str] = mapped_column("description", Text, default="", nullable=False)
    ativo: Mapped[bool] = mapped_column("active", Boolean, default=True, nullable=False)


class SystemSetting(Base):
    __tablename__ = "system_settings"
    chave: Mapped[str] = mapped_column("key", String(120), primary_key=True)
    valor: Mapped[str] = mapped_column("value", Text, default="", nullable=False)
    tipo: Mapped[str] = mapped_column("value_type", String(30), default="string", nullable=False)
    descricao: Mapped[str] = mapped_column("description", Text, default="", nullable=False)
    grupo: Mapped[str] = mapped_column("group_name", String(80), default="geral", nullable=False)
    ativo: Mapped[bool] = mapped_column("active", Boolean, default=True, nullable=False)


class ReportType(Base):
    __tablename__ = "report_types"
    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    codigo: Mapped[str] = mapped_column("code", String(60), unique=True, nullable=False)
    nome: Mapped[str] = mapped_column("name", String(120), nullable=False)
    descricao: Mapped[str] = mapped_column("description", Text, default="", nullable=False)
    formatos: Mapped[str] = mapped_column("formats", Text, default="csv", nullable=False)
    ativo: Mapped[bool] = mapped_column("active", Boolean, default=True, nullable=False)


class MenuItem(Base):
    __tablename__ = "menus"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    modulo_id: Mapped[str | None] = mapped_column("module_id", ForeignKey("modules.id", ondelete="SET NULL"), nullable=True)
    parent_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    nome: Mapped[str] = mapped_column("name", String(120), nullable=False)
    rota: Mapped[str] = mapped_column("route", String(180), default="", nullable=False)
    icone: Mapped[str] = mapped_column("icon", String(80), default="circle", nullable=False)
    ordem: Mapped[int] = mapped_column("display_order", Integer, default=0, nullable=False)
    ativo: Mapped[bool] = mapped_column("active", Boolean, default=True, nullable=False)
