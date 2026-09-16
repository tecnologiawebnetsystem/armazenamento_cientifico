from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users.models import User, Perfil


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


class PerfilRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def find_by_id(self, perfil_id: str) -> Perfil | None:
        return await self.session.scalar(select(Perfil).where(Perfil.id == perfil_id))

    async def list_all(self) -> list[Perfil]:
        result = await self.session.scalars(select(Perfil).order_by(Perfil.nome))
        return list(result)

    async def create(self, perfil: Perfil) -> Perfil:
        self.session.add(perfil)
        await self.session.flush()
        return perfil

    async def update(self, perfil: Perfil) -> Perfil:
        await self.session.merge(perfil)
        await self.session.flush()
        return perfil
