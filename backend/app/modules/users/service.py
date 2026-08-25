from app.core.exceptions import NotFoundException
from app.modules.users.models import User
from app.modules.users.repository import UserRepository


class UserService:
    def __init__(self, repository: UserRepository):
        self.repository = repository

    async def list_users(self) -> list[User]:
        return await self.repository.list_all()

    async def change_role(self, user_id: str, role: str) -> User:
        user = await self.repository.update_role(user_id, role)
        if user is None:
            raise NotFoundException("Usuário não encontrado")
        return user
