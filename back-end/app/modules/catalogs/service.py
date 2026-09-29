from app.modules.catalogs.navigation_models import MenuItem, Module, Permission
from app.modules.catalogs.project_catalog_models import ProjectStatus, ResponsibleArea
from app.modules.catalogs.repository import (
    MenuItemRepository,
    ModuleRepository,
    PermissionRepository,
    ProjectStatusRepository,
      ResponsibleAreaRepository,
)


class ModuleService:
    def __init__(self, repository: ModuleRepository):
        self.repository = repository

    async def get_module(self, module_id: str) -> Module | None:
        return await self.repository.find_by_id(module_id)

    async def list_active_modules(self) -> list[Module]:
        return await self.repository.list_active()

    async def list_all_modules(self) -> list[Module]:
        return await self.repository.list_all()


class PermissionService:
    def __init__(self, repository: PermissionRepository):
        self.repository = repository

    async def get_permission(self, permission_id: str) -> Permission | None:
        return await self.repository.find_by_id(permission_id)

    async def list_permissions_by_module(self, module_id: str) -> list[Permission]:
        return await self.repository.list_by_module(module_id)

    async def list_all_permissions(self) -> list[Permission]:
        return await self.repository.list_all()


class ProjectStatusService:
    def __init__(self, repository: ProjectStatusRepository):
        self.repository = repository

    async def get_status(self, status_id: str) -> ProjectStatus | None:
        return await self.repository.find_by_id(status_id)

    async def list_active_statuses(self) -> list[ProjectStatus]:
        return await self.repository.list_active()


class ResponsibleAreaService:
    def __init__(self, repository: ResponsibleAreaRepository):
        self.repository = repository

    async def get_area(self, area_id: str) -> ResponsibleArea | None:
        return await self.repository.find_by_id(area_id)

    async def list_active_areas(self) -> list[ResponsibleArea]:
        return await self.repository.list_active()

    async def list_all_areas(self) -> list[ResponsibleArea]:
        return await self.repository.list_all()


class MenuItemService:
    def __init__(self, repository: MenuItemRepository):
        self.repository = repository

    async def get_menu_item(self, menu_id: str) -> MenuItem | None:
        return await self.repository.find_by_id(menu_id)

    async def list_active_menu_items(self) -> list[MenuItem]:
        return await self.repository.list_active()
