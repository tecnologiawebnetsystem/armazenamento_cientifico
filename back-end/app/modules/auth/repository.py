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
            select u.*, s.cav4_subject, p.id as profile_id, p.name as profile_name,
                   coalesce(array_agg(distinct perm.id) filter
                     (where pp.allowed = true and perm.active = true), '{{}}') as db_permissions
            from {self.schema}.sessions s
            join {self.schema}.users u on u.id = s.user_id
            left join {self.schema}.profiles p on p.id = u.profile_id
            left join {self.schema}.profile_permissions pp on pp.profile_id = p.id
            left join {self.schema}.permissions perm on perm.id = pp.permission_id
            where s.id = :session_id and s.expires_at > now()
            group by u.id, s.cav4_subject, p.id, p.name
        """), {"session_id": session_id})
        row = result.mappings().first()
        return dict(row) if row else None

    async def find_user_by_email(self, email: str) -> dict[str, Any] | None:
        result = await self.database.execute(
            text(f"select id, profile_id from {self.schema}.users where lower(email)=lower(:email)"),
            {"email": email},
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def create_session(self, user_id: str, session_id: str, expires_at: datetime, subject: str) -> None:
        await self.database.execute(text(f"update {self.schema}.users set last_login_at=now() where id=:user_id"), {"user_id": user_id})
        await self.database.execute(text(f"delete from {self.schema}.sessions where user_id=:user_id"), {"user_id": user_id})
        await self.database.execute(text(f"""insert into {self.schema}.sessions
            (id,user_id,expires_at,cav4_subject) values(:id,:user_id,:expires_at,:subject)"""),
            {"id": session_id, "user_id": user_id, "expires_at": expires_at, "subject": subject})
        await self.database.commit()

    async def revoke_session(self, session_id: str) -> None:
        await self.database.execute(text(f"delete from {self.schema}.sessions where id=:session_id"), {"session_id": session_id})
        await self.database.commit()
