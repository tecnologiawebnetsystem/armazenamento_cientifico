# TODO(verificar com a equipe de devs): só é importado por users/service.py, que não tem importador
# (varredura de 2026-10-14). Mantido até a confirmação da equipe.
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users.models import Profile, User


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def find_by_id(self, user_id: str) -> User | None:
        return await self.session.scalar(select(User).where(User.id == user_id))

    async def find_by_user_id(self, user_id: str) -> User | None:
        return await self.session.scalar(select(User).where(User.user_id == user_id))

    async def list_all(self, skip: int = 0, limit: int = 100) -> list[User]:
        stmt = select(User).offset(skip).limit(limit).order_by(User.user_id)
        result = await self.session.scalars(stmt)
        return list(result)

    async def create(self, user: User) -> User:
        self.session.add(user)
        await self.session.flush()
        return user

    async def update(self, user: User) -> User:
        await self.session.merge(user)
        return user

    async def list_as_dict(self) -> list[dict[str, Any]]:
        result = await self.session.execute(
            select(User.id, User.user_id.label("userId"), User.profile_id.label("perfilId"),
                   User.last_login_at.label("ultimoLogin"), User.created_at.label("criadoEm"))
            .order_by(User.user_id)
        )
        return [dict(row) for row in result.mappings().all()]

    async def delete(self, user_id: str) -> bool:
        user = await self.find_by_id(user_id)
        if user:
            await self.session.delete(user)
            await self.session.flush()
            return True
        return False


class ProfileRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def find_by_id(self, profile_id: str) -> Profile | None:
        return await self.session.scalar(select(Profile).where(Profile.id == profile_id))

    async def list_all(self) -> list[Profile]:
        result = await self.session.scalars(select(Profile).order_by(Profile.name))
        return list(result)

    async def create(self, profile: Profile) -> Profile:
        self.session.add(profile)
        await self.session.flush()
        return profile

    async def update(self, profile: Profile) -> Profile:
        await self.session.merge(profile)
        await self.session.flush()
        return profile
