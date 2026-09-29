"""Sessão de autenticação (login local ou CAV4).

Antes desta declaração, a tabela ``sessions`` era acessada apenas por SQL cru
em ``app/modules/auth/repository.py`` e ``app/api/routes/cav4_auth.py``, sem
nenhum model ORM nem migration correspondente.
"""

from datetime import datetime

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserSession(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True, index=True)
    display_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    profile_id: Mapped[str | None] = mapped_column(String(20), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(nullable=False)
    cav4_subject: Mapped[str | None] = mapped_column(String(320), nullable=True)


__all__ = ["UserSession"]
