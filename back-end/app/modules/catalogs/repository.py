from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalogs.area_model import ResponsibleArea
from app.modules.catalogs.models import (
    MenuItem,
    Module,
    Permission,
    ProjectStatusCatalog,
    ProjectType,
    SystemSetting,
)


class ModuleRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def find_by_id(self, module_id: str) -> Module | None:
        return await self.session.scalar(select(Module).where(Module.id == module_id))

    async def list_active(self) -> list[Module]:
        result = await self.session.scalars(
            select(Module).where(Module.ativo.is_(True)).order_by(Module.ordem)
        )
        return list(result)

    async def list_all(self) -> list[Module]:
        result = await self.session.scalars(select(Module).order_by(Module.ordem))
        return list(result)


class PermissionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def find_by_id(self, permission_id: str) -> Permission | None:
        return await self.session.scalar(
            select(Permission).where(Permission.id == permission_id)
        )

    async def list_by_module(self, module_id: str) -> list[Permission]:
        result = await self.session.scalars(
            select(Permission).where(Permission.modulo_id == module_id)
        )
        return list(result)

    async def list_all(self) -> list[Permission]:
        result = await self.session.scalars(
            select(Permission).where(Permission.ativo.is_(True))
        )
        return list(result)


class SystemSettingRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def find_by_key(self, key: str) -> SystemSetting | None:
        return await self.session.scalar(
            select(SystemSetting).where(SystemSetting.chave == key)
        )

    async def list_all(self) -> list[SystemSetting]:
        result = await self.session.scalars(
            select(SystemSetting).where(SystemSetting.ativo.is_(True))
        )
        return list(result)

    async def list_by_group(self, group: str) -> list[SystemSetting]:
        result = await self.session.scalars(
            select(SystemSetting).where(
                SystemSetting.grupo == group, SystemSetting.ativo.is_(True)
            )
        )
        return list(result)


class ProjectStatusRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def find_by_id(self, status_id: str) -> ProjectStatusCatalog | None:
        return await self.session.scalar(
            select(ProjectStatusCatalog).where(ProjectStatusCatalog.id == status_id)
        )

    async def list_active(self) -> list[ProjectStatusCatalog]:
        result = await self.session.scalars(
            select(ProjectStatusCatalog)
            .where(ProjectStatusCatalog.ativo.is_(True))
            .order_by(ProjectStatusCatalog.ordem)
        )
        return list(result)


class ProjectTypeRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def find_by_id(self, type_id: str) -> ProjectType | None:
        return await self.session.scalar(
            select(ProjectType).where(ProjectType.id == type_id)
        )

    async def list_active(self) -> list[ProjectType]:
        result = await self.session.scalars(
            select(ProjectType).where(ProjectType.ativo.is_(True))
        )
        return list(result)


class ResponsibleAreaRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def find_by_id(self, area_id: str) -> ResponsibleArea | None:
        return await self.session.scalar(
            select(ResponsibleArea).where(ResponsibleArea.id == area_id)
        )

    async def list_active(self) -> list[ResponsibleArea]:
        result = await self.session.scalars(
            select(ResponsibleArea).where(ResponsibleArea.active.is_(True)).order_by(ResponsibleArea.name)
        )
        return list(result)

    async def list_all(self) -> list[ResponsibleArea]:
        result = await self.session.scalars(
            select(ResponsibleArea).order_by(ResponsibleArea.name)
        )
        return list(result)


class MenuItemRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def find_by_id(self, menu_id: str) -> MenuItem | None:
        return await self.session.scalar(select(MenuItem).where(MenuItem.id == menu_id))

    async def list_active(self) -> list[MenuItem]:
        result = await self.session.scalars(
            select(MenuItem)
            .where(MenuItem.ativo.is_(True))
            .order_by(MenuItem.ordem)
        )
        return list(result)
