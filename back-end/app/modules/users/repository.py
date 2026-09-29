from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users.models import Profile, User


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def find_by_id(self, user_id: str) -> User | None:
        return await self.session.scalar(select(User).where(User.id == user_id))

    async def find_by_email(self, email: str) -> User | None:
        return await self.session.scalar(select(User).where(User.email == email))

    async def list_all(self, skip: int = 0, limit: int = 100) -> list[User]:
        stmt = select(User).offset(skip).limit(limit).order_by(User.name)
        result = await self.session.scalars(stmt)
        return list(result)

    async def create(self, user: User) -> User:
        self.session.add(user)
        await self.session.flush()
        return user

    async def update(self, user: User) -> User:
        await self.session.merge(user)
        await self.session.flush()
        return user

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
