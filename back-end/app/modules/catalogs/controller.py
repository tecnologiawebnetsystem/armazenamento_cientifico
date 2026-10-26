import logging
from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import CurrentUser, require_capabilities
from app.core.authorization import require_capability
from app.db.session import get_session

from .repository import CatalogsRepository
from .service import CatalogsService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Catalogs"])

CONFIGURATION_RESOURCES = frozenset(CatalogsRepository.CONFIGURATION_MODELS)


def get_service(session: Annotated[AsyncSession, Depends(get_session)]) -> CatalogsService:
    return CatalogsService(CatalogsRepository(session))


Service = Annotated[CatalogsService, Depends(get_service)]
ConfigurationPayload = Annotated[dict[str, Any], Body()]


@router.get("/catalogos")
async def catalogs(service: Service, _: Annotated[dict, Depends(require_capabilities("read"))]):
    logger.info("catalogs_read")
    return await service.catalogs()


@router.get("/configurations/{resource}")
async def configurations(resource: str, service: Service, user: CurrentUser):
    if resource not in CONFIGURATION_RESOURCES:
        raise HTTPException(status_code=404, detail="Recurso de configuração inválido")
    require_capability(user, "configure")
    return await service.configurations(resource)


@router.post("/configurations/{resource}")
async def create_configuration(resource: str, service: Service, user: CurrentUser, payload: ConfigurationPayload):
    if resource not in CONFIGURATION_RESOURCES:
        raise HTTPException(status_code=404, detail="Recurso de configuração inválido")
    require_capability(user, "configure")
    return await service.create_configuration(resource, payload)


@router.patch("/configurations/{resource}/{identifier}")
async def update_configuration(resource: str, identifier: str, service: Service, user: CurrentUser, payload: ConfigurationPayload):
    if resource not in CONFIGURATION_RESOURCES:
        raise HTTPException(status_code=404, detail="Recurso de configuração inválido")
    require_capability(user, "configure")
    return await service.update_configuration(resource=resource, identifier=identifier, data=payload, current_user=user)


@router.delete("/configurations/{resource}/{identifier}")
async def delete_configuration(resource: str, identifier: str, service: Service, user: CurrentUser):
    if resource not in CONFIGURATION_RESOURCES:
        raise HTTPException(status_code=404, detail="Recurso de configuração inválido")
    require_capability(user, "configure")
    await service.delete_configuration(resource, identifier)
    return {"deleted": True}