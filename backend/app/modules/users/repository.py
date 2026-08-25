from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users.models import User


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def find_by_id(self, user_id: str) -> User | None:
        return await self.session.scalar(select(User).where(User.id == user_id))

    async def list_all(self) -> list[User]:
        result = await self.session.scalars(select(User).order_by(User.name))
        return list(result)

    async def update_role(self, user_id: str, role: str) -> User | None:
        await self.session.execute(update(User).where(User.id == user_id).values(role=role))
        await self.session.commit()
        return await self.find_by_id(user_id)
