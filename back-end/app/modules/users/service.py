from datetime import UTC, datetime
from uuid import uuid4

from app.modules.users.models import Profile, User
from app.modules.users.repository import ProfileRepository, UserRepository
from app.modules.users.schemas import ProfileCreate, UserCreate, UserUpdate


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
            job_title=data.cargo,
            area=data.area,
            avatar_url=data.avatar_url,
            role=data.role,
            profile_id=data.perfil_id,
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
            user.job_title = data.cargo
        if data.area is not None:
            user.area = data.area
        if data.avatar_url is not None:
            user.avatar_url = data.avatar_url
        if data.role is not None:
            user.role = data.role
        if data.perfil_id is not None:
            user.profile_id = data.perfil_id

        return await self.repository.update(user)

    async def delete_user(self, user_id: str) -> bool:
        return await self.repository.delete(user_id)


class ProfileService:
    def __init__(self, repository: ProfileRepository):
        self.repository = repository

    async def get_profile(self, profile_id: str) -> Profile | None:
        return await self.repository.find_by_id(profile_id)

    async def list_profiles(self) -> list[Profile]:
        return await self.repository.list_all()

    async def create_profile(self, data: ProfileCreate) -> Profile:
        now = datetime.now(UTC).replace(tzinfo=None)
        profile = Profile(
            id=data.name[:3].upper(),
            name=data.name,
            description=data.description,
            created_at=now,
        )
        return await self.repository.create(profile)

    async def update_profile(self, profile_id: str, data: ProfileCreate) -> Profile | None:
        profile = await self.repository.find_by_id(profile_id)
        if not profile:
            return None

        profile.name = data.name
        profile.description = data.description

        return await self.repository.update(profile)
