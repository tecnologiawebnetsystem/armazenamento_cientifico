import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import CurrentUser, require_capabilities
from app.db.session import get_session

from .repository import UserRepository
from .service import UserService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Users"])


def get_service(session: Annotated[AsyncSession, Depends(get_session)]) -> UserService:
    return UserService(UserRepository(session))


Service = Annotated[UserService, Depends(get_service)]


@router.get("/users")
async def list_users(service: Service, _: Annotated[dict, Depends(require_capabilities("manage_users"))]):
    logger.info("users_list")
    return {"users": await service.list_users_dict()}