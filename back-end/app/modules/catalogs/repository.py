"""Repository para leitura de catálogos e CRUD de configurações."""

from typing import Any, ClassVar

from sqlalchemy import and_, inspect, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base
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
from app.modules.users.models import Profile


class CatalogsRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def catalogs(self) -> dict[str, list[dict[str, Any]]]:
        return {
            "areas": [dict(row) for row in (await self.session.execute(
                select(ResponsibleArea.id, ResponsibleArea.name.label("nome"),
                       ResponsibleArea.prefix.label("prefixo"), ResponsibleArea.next_number)
                .where(ResponsibleArea.active.is_(True))
                .order_by(ResponsibleArea.name)
            )).mappings().all()],
            "perfis": [dict(row) for row in (await self.session.execute(
                select(Profile.id, Profile.name.label("nome"), Profile.description.label("descricao"))
                .order_by(Profile.name)
            )).mappings().all()],
            "modulos": [dict(row) for row in (await self.session.execute(
                select(Module.id, Module.name.label("nome"), Module.route.label("rota"),
                       Module.icon.label("icone"), Module.display_order.label("ordem"),
                       Module.active.label("ativo"))
                .where(Module.active.is_(True))
                .order_by(Module.display_order, Module.name)
            )).mappings().all()],
            "permissoes": [dict(row) for row in (await self.session.execute(
                select(Permission.id, Permission.module_id.label("modulo_id"),
                       Permission.name.label("nome"), Permission.description.label("descricao"),
                       Permission.active.label("ativo"))
                .where(Permission.active.is_(True))
                .order_by(Permission.name)
            )).mappings().all()],
            "statusProjetos": [dict(row) for row in (await self.session.execute(
                select(ProjectStatus.id, ProjectStatus.code.label("codigo"),
                       ProjectStatus.name.label("nome"), ProjectStatus.color.label("cor"),
                       ProjectStatus.display_order.label("ordem"), ProjectStatus.active.label("ativo"),
                       ProjectStatus.allows_edit.label("permite_edicao"))
                .where(ProjectStatus.active.is_(True))
                .order_by(ProjectStatus.display_order)
            )).mappings().all()],
            "tiposRelatorios": [dict(row) for row in (await self.session.execute(
                select(ReportType.id, ReportType.code.label("codigo"),
                       ReportType.name.label("nome"), ReportType.description.label("descricao"),
                       ReportType.formats.label("formatos"), ReportType.active.label("ativo"))
                .where(ReportType.active.is_(True))
                .order_by(ReportType.name)
            )).mappings().all()],
        }

    CONFIGURATION_MODELS: ClassVar[dict[str, tuple[type[Base], tuple[str, ...]]]] = {
        "menus": (MenuItem, ("id", "module_id", "parent_id", "name", "route", "icon", "display_order", "active")),
        "modules": (Module, ("id", "name", "route", "icon", "display_order", "active")),
        "permissions": (Permission, ("id", "module_id", "name", "description", "active")),
        "profiles": (Profile, ("id", "name", "description")),
        "project_statuses": (ProjectStatus, ("id", "code", "name", "color", "display_order", "active", "allows_edit")),
        "responsible_areas": (ResponsibleArea, ("id", "name", "prefix", "next_number", "active")),
        "report_types": (ReportType, ("id", "code", "name", "description", "formats", "active")),
        "report_fields": (ReportField, ("id", "report_code", "field_key", "label", "source_key", "display_order", "active")),
        "dashboard_cards": (DashboardCard, ("id", "module_id", "key", "title", "description", "metric_key", "route", "profile_ids", "display_order", "active")),
        "menu_permissions": (MenuPermission, ("menu_id", "permission_id", "allowed")),
        "profile_permissions": (ProfilePermission, ("profile_id", "permission_id", "allowed")),
        "profile_modules": (ProfileModule, ("profile_id", "module_id", "can_view")),
    }

    def _configuration_keys(self, model: type[Base]) -> list[str]:
        return [col.name for col in inspect(model).primary_key]

    async def configuration_rows(self, resource: str) -> list[dict[str, Any]]:
        model, columns = self.CONFIGURATION_MODELS[resource]
        cols = [getattr(model, col) for col in columns]
        result = await self.session.execute(select(*cols).order_by(getattr(model, columns[0])))
        return [dict(row) for row in result.mappings().all()]

    async def create_configuration(self, resource: str, data: dict[str, Any]) -> dict[str, Any]:
        model, columns = self.CONFIGURATION_MODELS[resource]
        pk_names = self._configuration_keys(model)
        if any(key not in data for key in pk_names):
            raise ValueError("Todos os campos de identificação são obrigatórios")
        instance = model(**{col: data[col] for col in columns if col in data})
        self.session.add(instance)
        await self.session.flush()
        cols = [getattr(model, col) for col in columns]
        where = and_(*[getattr(model, key) == data[key] for key in pk_names])
        result = await self.session.execute(select(*cols).where(where))
        return dict(result.mappings().first())

    async def update_configuration(
        self, resource: str, identifier: str, data: dict[str, Any], current_user: dict[str, Any],
    ) -> dict[str, Any]:
        model, columns = self.CONFIGURATION_MODELS[resource]
        pk_names = self._configuration_keys(model)
        identifiers = identifier.split("|")
        if len(identifiers) != len(pk_names) or any(not value for value in identifiers):
            raise ValueError("Identificador de configuração inválido")
        key_params = dict(zip(pk_names, identifiers))
        pk_cols = [getattr(model, key) for key in pk_names]
        where = and_(*[col == key_params[key] for key, col in zip(pk_names, pk_cols)])
        result = await self.session.execute(select(model).where(where))
        instance = result.scalar_one_or_none()
        if instance is None:
            raise ValueError("Registro não encontrado")
        updatable = [col for col in columns if col not in pk_names and col in data]
        if not updatable:
            raise ValueError("Nenhum campo informado")
        for col_name in updatable:
            setattr(instance, col_name, data[col_name])
        await self.session.flush()
        cols = [getattr(model, col) for col in columns]
        result = await self.session.execute(select(*cols).where(where))
        return dict(result.mappings().first())

    async def delete_configuration(self, resource: str, identifier: str) -> None:
        model, _ = self.CONFIGURATION_MODELS[resource]
        pk_names = self._configuration_keys(model)
        identifiers = identifier.split("|")
        if len(identifiers) != len(pk_names) or any(not value for value in identifiers):
            raise ValueError("Identificador de configuração inválido")
        key_params = dict(zip(pk_names, identifiers))
        pk_cols = [getattr(model, key) for key in pk_names]
        where = and_(*[col == key_params[key] for key, col in zip(pk_names, pk_cols)])
        result = await self.session.execute(select(model).where(where))
        instance = result.scalar_one_or_none()
        if instance is None:
            raise ValueError("Registro não encontrado")
        await self.session.delete(instance)
        await self.session.flush()
