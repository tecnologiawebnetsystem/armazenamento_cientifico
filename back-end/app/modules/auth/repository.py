import json
import re
from datetime import datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class AuthRepository:
    def __init__(self, database: AsyncSession, schema: str) -> None:
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", schema):
            raise ValueError("DB_SCHEMA inválido")
        self.database = database
        self.schema = f'"{schema}"'

    async def find_session_identity(self, session_id: str) -> dict[str, Any] | None:
        result = await self.database.execute(text(f"""
            select s.id, s.user_id, u.user_id as cav4_user_id,
                   s.profile_data, u.last_login_at, u.created_at, s.profile_id,
                   p.name as profile_name,
                   coalesce(array_agg(distinct perm.id) filter
                     (where pp.allowed = true and perm.active = true), '{{}}') as db_permissions
            from {self.schema}.sessions s
            left join {self.schema}.users u on u.id = s.user_id
            left join {self.schema}.profiles p on p.id = s.profile_id
            left join {self.schema}.profile_permissions pp on pp.profile_id = p.id
            left join {self.schema}.permissions perm on perm.id = pp.permission_id
            where s.id = :session_id and s.expires_at > now()
            group by s.id, s.user_id, u.user_id, s.profile_data, u.last_login_at, u.created_at, s.profile_id, p.name
        """), {"session_id": session_id})
        row = result.mappings().first()
        if not row:
            return None
        identity = dict(row)
        if isinstance(identity.get("profile_data"), str):
            try:
                identity["profile_data"] = json.loads(identity["profile_data"])
            except json.JSONDecodeError:
                identity["profile_data"] = {}
        return identity

    async def create_session(self, user_id: str, session_id: str, expires_at: datetime) -> None:
        user_result = await self.database.execute(
            text(f"select profile_id from {self.schema}.users where id=:user_id"),
            {"user_id": user_id},
        )
        user = user_result.mappings().first()
        if not user or not user.get("profile_id"):
            raise ValueError("Usuário sem perfil para criar sessão")
        await self.database.execute(text(f"update {self.schema}.users set last_login_at=now() where id=:user_id"), {"user_id": user_id})
        await self.database.execute(text(f"delete from {self.schema}.sessions where user_id=:user_id"), {"user_id": user_id})
        await self.database.execute(text(f"""insert into {self.schema}.sessions
            (id,user_id,profile_id,expires_at)
            values(:id,:user_id,:profile_id,:expires_at)"""),
            {"id": session_id, "user_id": user_id, "profile_id": user["profile_id"], "expires_at": expires_at})
        await self.database.commit()

    async def create_cav4_session(self, user_id: str, profile_id: str, session_id: str, expires_at: datetime) -> None:
        await self.database.execute(
            text(f"delete from {self.schema}.sessions where user_id=:user_id"),
            {"user_id": user_id},
        )
        await self.database.execute(
            text(f"""insert into {self.schema}.sessions
                (id,user_id,profile_id,expires_at)
                values(:id,:user_id,:profile_id,:expires_at)"""),
            {"id": session_id, "user_id": user_id, "profile_id": profile_id, "expires_at": expires_at},
        )
        await self.database.commit()

    async def revoke_session(self, session_id: str) -> None:
        await self.database.execute(text(f"delete from {self.schema}.sessions where id=:session_id"), {"session_id": session_id})
        await self.database.commit()
