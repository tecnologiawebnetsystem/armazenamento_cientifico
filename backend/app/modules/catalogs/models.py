
from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Permission(Base):
    __tablename__ = "permissoes"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    modulo_id: Mapped[str] = mapped_column(ForeignKey("modulos.id", ondelete="CASCADE"), nullable=False, index=True)
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, default="", nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class ProfilePermission(Base):
    __tablename__ = "perfil_permissoes"
    perfil_id: Mapped[str] = mapped_column(ForeignKey("perfis.id", ondelete="CASCADE"), primary_key=True)
    permissao_id: Mapped[str] = mapped_column(ForeignKey("permissoes.id", ondelete="CASCADE"), primary_key=True)
    permitido: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Module(Base):
    __tablename__ = "modulos"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    nome: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    rota: Mapped[str] = mapped_column(String(180), default="", nullable=False)
    icone: Mapped[str] = mapped_column(String(80), default="folder", nullable=False)
    ordem: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class ProfileModule(Base):
    __tablename__ = "perfil_modulos"
    perfil_id: Mapped[str] = mapped_column(ForeignKey("perfis.id", ondelete="CASCADE"), primary_key=True)
    modulo_id: Mapped[str] = mapped_column(ForeignKey("modulos.id", ondelete="CASCADE"), primary_key=True)
    pode_visualizar: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class ProjectStatusCatalog(Base):
    __tablename__ = "status_projetos"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    codigo: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    cor: Mapped[str] = mapped_column(String(20), default="slate", nullable=False)
    ordem: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    permite_edicao: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class ProjectType(Base):
    __tablename__ = "tipos_projetos"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    codigo: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, default="", nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class SystemSetting(Base):
    __tablename__ = "configuracoes_sistema"
    chave: Mapped[str] = mapped_column(String(120), primary_key=True)
    valor: Mapped[str] = mapped_column(Text, default="", nullable=False)
    tipo: Mapped[str] = mapped_column(String(30), default="string", nullable=False)
    descricao: Mapped[str] = mapped_column(Text, default="", nullable=False)
    grupo: Mapped[str] = mapped_column(String(80), default="geral", nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class ReportType(Base):
    __tablename__ = "tipos_relatorios"
    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    codigo: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, default="", nullable=False)
    formatos: Mapped[str] = mapped_column(Text, default="csv", nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class MenuItem(Base):
    __tablename__ = "menus"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    modulo_id: Mapped[str | None] = mapped_column(ForeignKey("modulos.id", ondelete="SET NULL"), nullable=True)
    parent_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    rota: Mapped[str] = mapped_column(String(180), default="", nullable=False)
    icone: Mapped[str] = mapped_column(String(80), default="circle", nullable=False)
    ordem: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
