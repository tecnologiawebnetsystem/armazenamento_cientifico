"""Sessão de autenticação (login local ou CAV4).

Antes desta declaração, a tabela ``sessions`` era acessada apenas por SQL cru
em ``app/modules/auth/repository.py`` e ``app/api/routes/cav4_auth.py``, sem
nenhum model ORM nem migration correspondente.
"""

from datetime import datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserSession(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), String(32), nullable=False, index=True)
    profile_id: Mapped[str | None] = mapped_column(ForeignKey("profiles.id", ondelete="RESTRICT"), String(20), nullable=True)
    profile_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(nullable=False)


__all__ = ["UserSession"]
