import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv(Path(__file__).resolve().parents[2] / ".env")


class Settings(BaseModel):
    app_name: str = "SIGAC — Sistema de Gestão de Acesso ao Armazenamento Científico API"
    app_version: str = "3.1.0"
    database_engine: str = os.getenv("DATABASE_ENGINE", "sqlite").lower()
    database_url: str = os.getenv(
        "DATABASE_URL",
        "sqlite+aiosqlite:///./data/sigac.db" if os.getenv("DATABASE_ENGINE", "sqlite").lower() == "sqlite"
        else "postgresql+asyncpg://sigac:sigac_dev_password@localhost:5432/sigac",
    )
    seed_database: bool = os.getenv("SEED_DATABASE", "true").lower() == "true"
    cors_origins: list[str] = [
        x.strip()
        for x in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
        if x.strip()
    ]
    cookie_name: str = os.getenv("COOKIE_NAME", "wayon_session_id")
    cookie_secure: bool = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    session_hours: int = int(os.getenv("SESSION_HOURS", "8"))
    db_min_size: int = int(os.getenv("DB_MIN_SIZE", "1"))
    db_max_size: int = int(os.getenv("DB_MAX_SIZE", "10"))
    db_command_timeout: int = int(os.getenv("DB_COMMAND_TIMEOUT", "30"))
    api_prefix: str = os.getenv("API_PREFIX", "/api")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    environment: str = os.getenv("ENVIRONMENT", "development")
    expose_api_docs: bool = os.getenv("EXPOSE_API_DOCS", "true").lower() == "true"
    request_log_max_id_length: int = int(os.getenv("REQUEST_LOG_MAX_ID_LENGTH", "100"))
    security_headers_enabled: bool = os.getenv("SECURITY_HEADERS_ENABLED", "true").lower() == "true"
    cookie_domain: str | None = os.getenv("COOKIE_DOMAIN") or None
    audit_retention_days: int = int(os.getenv("AUDIT_RETENTION_DAYS", "365"))
    entra_tenant_id: str = os.getenv("ENTRA_TENANT_ID", "")
    entra_client_id: str = os.getenv("ENTRA_CLIENT_ID", "")
    entra_client_secret: str = os.getenv("ENTRA_CLIENT_SECRET", "")
    entra_redirect_uri: str = os.getenv("ENTRA_REDIRECT_URI", "http://localhost:8080/api/auth/entra/callback")
    entra_scopes: str = os.getenv("ENTRA_SCOPES", "openid profile email User.Read GroupMember.Read.All")
    entra_group_sync_enabled: bool = os.getenv("ENTRA_GROUP_SYNC_ENABLED", "true").lower() == "true"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
