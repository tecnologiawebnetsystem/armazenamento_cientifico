"""Serviço de catálogos e configurações."""

from typing import Any

from .repository import CatalogsRepository


class CatalogsService:
    def __init__(self, repository: CatalogsRepository):
        self.repository = repository

    async def catalogs(self) -> dict[str, list[dict[str, Any]]]:
        return await self.repository.catalogs()

    async def configurations(self, resource: str) -> list[dict[str, Any]]:
        return await self.repository.configuration_rows(resource)

    async def create_configuration(self, resource: str, data: dict[str, Any]) -> dict[str, Any]:
        return await self.repository.create_configuration(resource, data)

    async def update_configuration(self, resource: str, identifier: str, data: dict[str, Any], current_user: dict[str, Any]) -> dict[str, Any]:
        return await self.repository.update_configuration(resource=resource, identifier=identifier, data=data, current_user=current_user)

    async def delete_configuration(self, resource: str, identifier: str) -> None:
        await self.repository.delete_configuration(resource, identifier)
