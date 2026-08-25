from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.users.repository import UserRepository
from app.modules.users.schemas import UserOut, UserRoleUpdate
from app.modules.users.service import UserService

router = APIRouter(prefix="/api/users", tags=["Users"])
Session = Annotated[AsyncSession, Depends(get_session)]


def get_service(session: Session) -> UserService:
    return UserService(UserRepository(session))


@router.get("", response_model=list[UserOut])
async def list_users(service: Annotated[UserService, Depends(get_service)]):
    return await service.list_users()


@router.patch("/{user_id}/role", response_model=UserOut)
async def update_user_role(
    user_id: str,
    body: UserRoleUpdate,
    service: Annotated[UserService, Depends(get_service)],
):
    return await service.change_role(user_id, body.role)
