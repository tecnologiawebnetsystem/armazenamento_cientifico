from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalogs.navigation_models import MenuItem, Module, Permission
from app.modules.catalogs.project_catalog_models import ProjectStatus, ResponsibleArea


class ModuleRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def find_by_id(self, module_id: str) -> Module | None:
        return await self.session.scalar(select(Module).where(Module.id == module_id))

    async def list_active(self) -> list[Module]:
        result = await self.session.scalars(
            select(Module).where(Module.active.is_(True)).order_by(Module.display_order)
        )
        return list(result)

    async def list_all(self) -> list[Module]:
        result = await self.session.scalars(select(Module).order_by(Module.display_order))
        return list(result)


class PermissionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def find_by_id(self, permission_id: str) -> Permission | None:
        return await self.session.scalar(
            select(Permission).where(Permission.id == permission_id)
        )

    async def list_by_module(self, module_id: str) -> list[Permission]:
        result = await self.session.scalars(select(Permission).where(Permission.module_id == module_id))
        return list(result)

    async def list_all(self) -> list[Permission]:
        result = await self.session.scalars(
            select(Permission).where(Permission.active.is_(True))
        )
        return list(result)


class ProjectStatusRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def find_by_id(self, status_id: str) -> ProjectStatus | None:
        return await self.session.scalar(
            select(ProjectStatus).where(ProjectStatus.id == status_id)
        )

    async def list_active(self) -> list[ProjectStatus]:
        result = await self.session.scalars(
            select(ProjectStatus)
            .where(ProjectStatus.active.is_(True))
            .order_by(ProjectStatus.display_order)
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
            .where(MenuItem.active.is_(True))
            .order_by(MenuItem.display_order)
        )
        return list(result)
