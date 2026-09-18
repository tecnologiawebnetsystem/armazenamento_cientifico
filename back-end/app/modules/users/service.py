from datetime import UTC, datetime
from uuid import uuid4

from app.modules.users.models import Perfil, User
from app.modules.users.repository import PerfilRepository, UserRepository
from app.modules.users.schemas import PerfilCreate, UserCreate, UserUpdate


class UserService:
    def __init__(self, repository: UserRepository):
        self.repository = repository

    async def get_user(self, user_id: str) -> User | None:
        return await self.repository.find_by_id(user_id)

    async def get_user_by_email(self, email: str) -> User | None:
        return await self.repository.find_by_email(email)

    async def list_users(self, skip: int = 0, limit: int = 100) -> list[User]:
        return await self.repository.list_all(skip, limit)

    async def create_user(self, data: UserCreate) -> User:
        user = User(
            id=str(uuid4()),
            name=data.name,
            email=data.email,
            cargo=data.cargo,
            area=data.area,
            avatar_url=data.avatar_url,
            role=data.role,
            perfil_id=data.perfil_id,
            created_at=datetime.now(UTC).replace(tzinfo=None),
        )
        return await self.repository.create(user)

    async def update_user(self, user_id: str, data: UserUpdate) -> User | None:
        user = await self.repository.find_by_id(user_id)
        if not user:
            return None

        if data.name is not None:
            user.name = data.name
        if data.cargo is not None:
            user.cargo = data.cargo
        if data.area is not None:
            user.area = data.area
        if data.avatar_url is not None:
            user.avatar_url = data.avatar_url
        if data.role is not None:
            user.role = data.role
        if data.perfil_id is not None:
            user.perfil_id = data.perfil_id

        return await self.repository.update(user)

    async def delete_user(self, user_id: str) -> bool:
        return await self.repository.delete(user_id)


class PerfilService:
    def __init__(self, repository: PerfilRepository):
        self.repository = repository

    async def get_perfil(self, perfil_id: str) -> Perfil | None:
        return await self.repository.find_by_id(perfil_id)

    async def list_perfis(self) -> list[Perfil]:
        return await self.repository.list_all()

    async def create_perfil(self, data: PerfilCreate) -> Perfil:
        now = datetime.now(UTC).replace(tzinfo=None)
        perfil = Perfil(
            id=data.nome[:3].upper(),
            nome=data.nome,
            descricao=data.descricao,
            criado_em=now,
        )
        return await self.repository.create(perfil)

    async def update_perfil(self, perfil_id: str, data: PerfilCreate) -> Perfil | None:
        perfil = await self.repository.find_by_id(perfil_id)
        if not perfil:
            return None

        perfil.nome = data.nome
        perfil.descricao = data.descricao

        return await self.repository.update(perfil)
