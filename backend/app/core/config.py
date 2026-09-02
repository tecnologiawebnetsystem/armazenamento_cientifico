import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel, Field, model_validator

load_dotenv(Path(__file__).resolve().parents[2] / ".env")


def _resolve_engine() -> str:
    """Determina o banco ativo.

    Se DATABASE_ENGINE for informado, ele tem prioridade. Caso contrário,
    o engine é inferido a partir do esquema da DATABASE_URL — assim um
    deploy que fornece apenas uma DATABASE_URL PostgreSQL.
    funciona sem exigir variáveis extras.
    """
    explicit = os.getenv("DATABASE_ENGINE")
    if explicit:
        engine = explicit.lower()
        if engine not in {"sqlite", "postgresql", "postgres"}:
            raise ValueError("DATABASE_ENGINE deve ser sqlite ou postgresql")
        return "postgresql" if engine == "postgres" else engine
    url = (os.getenv("DATABASE_URL") or "").lower()
    if url.startswith(("postgresql://", "postgres://")):
        return "postgresql"
    return "sqlite"


def _database_url(engine: str) -> str:
    if engine == "sqlite":
        return os.getenv("DATABASE_URL_SQLITE") or os.getenv("DATABASE_URL") or "sqlite+aiosqlite:///./data/sigac.db"
    return os.getenv("DATABASE_URL_POSTGRESQL") or os.getenv("DATABASE_URL") or ""


_RESOLVED_ENGINE = _resolve_engine()


class Settings(BaseModel):
    app_name: str = "SIGAC — Sistema de Gestão de Acesso ao Armazenamento Científico API"
    app_version: str = "3.1.0"
    database_engine: str = _RESOLVED_ENGINE
    database_url: str = _database_url(_RESOLVED_ENGINE)
    seed_database: bool = os.getenv(
        "SEED_DATABASE",
        "false" if os.getenv("ENVIRONMENT", "development").lower() == "production" else "true",
    ).lower() == "true"
    cors_origins: list[str] = [
        x.strip()
        for x in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
        if x.strip()
    ]
    cookie_name: str = os.getenv("COOKIE_NAME", "wayon_session_id")
    cookie_secure: bool = os.getenv(
        "COOKIE_SECURE",
        "true" if os.getenv("ENVIRONMENT", "development").lower() == "production" else "false",
    ).lower() == "true"
    session_hours: int = int(os.getenv("SESSION_HOURS", "8"))
    db_min_size: int = int(os.getenv("DB_MIN_SIZE", "1"))
    db_max_size: int = int(os.getenv("DB_MAX_SIZE", "10"))
    db_command_timeout: int = int(os.getenv("DB_COMMAND_TIMEOUT", "30"))
    api_prefix: str = os.getenv("API_PREFIX", "/api")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    environment: str = os.getenv("ENVIRONMENT", "development")
    expose_api_docs: bool = os.getenv(
        "EXPOSE_API_DOCS",
        "false" if os.getenv("ENVIRONMENT", "development").lower() == "production" else "true",
    ).lower() == "true"
    request_log_max_id_length: int = int(os.getenv("REQUEST_LOG_MAX_ID_LENGTH", "100"))
    security_headers_enabled: bool = os.getenv("SECURITY_HEADERS_ENABLED", "true").lower() == "true"
    cookie_domain: str | None = os.getenv("COOKIE_DOMAIN") or None
    audit_retention_days: int = int(os.getenv("AUDIT_RETENTION_DAYS", "365"))
    entra_tenant_id: str = os.getenv("ENTRA_TENANT_ID", "")
    entra_client_id: str = os.getenv("ENTRA_CLIENT_ID", "")
    entra_client_secret: str = os.getenv("ENTRA_CLIENT_SECRET", "")
    entra_redirect_uri: str = os.getenv("ENTRA_REDIRECT_URI", "http://localhost:8080/api/auth/entra/callback")
    entra_scopes: str = os.getenv("ENTRA_SCOPES", "openid profile email User.Read GroupMember.Read.All")
    entra_groups: list[str] = Field(default_factory=lambda: _csv("ENTRA_GROUPS"))
    entra_group_sync_enabled: bool = os.getenv("ENTRA_GROUP_SYNC_ENABLED", "true").lower() == "true"

    @model_validator(mode="after")
    def validate_entra(self) -> "Settings":
        if self.database_engine not in {"sqlite", "postgresql", "postgres"}:
            raise ValueError("DATABASE_ENGINE deve ser sqlite ou postgresql")
        if not self.database_url.strip():
            raise ValueError("DATABASE_URL é obrigatória para o banco selecionado")
        if self.database_engine == "sqlite" and not self.database_url.startswith(("sqlite://", "sqlite+aiosqlite://")):
            raise ValueError("SQLite exige uma DATABASE_URL sqlite:// ou sqlite+aiosqlite://")
        if self.database_engine != "sqlite" and not self.database_url.startswith(("postgresql://", "postgres://")):
            raise ValueError("PostgreSQL exige uma DATABASE_URL PostgreSQL")
        if self.db_min_size < 1 or self.db_max_size < self.db_min_size:
            raise ValueError("DB_MIN_SIZE e DB_MAX_SIZE possuem valores inválidos")
        required = {
            "ENTRA_TENANT_ID": self.entra_tenant_id,
            "ENTRA_CLIENT_ID": self.entra_client_id,
            "ENTRA_CLIENT_SECRET": self.entra_client_secret,
        }
        if any(value.strip() for value in required.values()) and not all(value.strip() for value in required.values()):
            missing = ", ".join(name for name, value in required.items() if not value.strip())
            raise ValueError(f"Configuração Entra ID incompleta; faltando: {missing}")
        if any(required.values()) and (not self.entra_redirect_uri.strip() or not self.entra_scopes.strip()):
            raise ValueError("Configuração Entra ID incompleta; callback e escopos são obrigatórios")
        return self


def _csv(name: str) -> list[str]:
    return [item.strip() for item in os.getenv(name, "").split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
