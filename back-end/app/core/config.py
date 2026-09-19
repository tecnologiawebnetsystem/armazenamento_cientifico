import os
import re
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel, Field, model_validator

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")
load_dotenv()


def _database_url() -> str:
    aurora_url = (
        os.getenv("RDS_AURORA_POSTGRES_URL", "").strip()
        or os.getenv("DATABASE_URL", "").strip()
        or os.getenv("POSTGRES_URL", "").strip()
    )
    if aurora_url:
        return aurora_url if "://" in aurora_url else f"postgresql://{aurora_url}"

    host = (
        os.getenv("RDS_AURORA_POSTGRES_HOST", "").strip()
        or os.getenv("POSTGRES_HOST", "").strip()
        or os.getenv("PGHOST", "").strip()
    )
    user = (
        os.getenv("RDS_AURORA_POSTGRES_USERNAME", "").strip()
        or os.getenv("POSTGRES_USER", "").strip()
        or os.getenv("PGUSER", "").strip()
    )
    password = (
        os.getenv("RDS_AURORA_POSTGRES_PASSWORD", "").strip()
        or os.getenv("POSTGRES_PASSWORD", "").strip()
        or os.getenv("PGPASSWORD", "").strip()
    )
    if host and user and password:
        from urllib.parse import quote

        database = (
            os.getenv("RDS_AURORA_POSTGRES_DATABASE", "").strip()
            or os.getenv("POSTGRES_DATABASE", "").strip()
            or os.getenv("PGDATABASE", "").strip()
            or "a25034d"
        )
        credentials = f"{quote(user, safe='')}:{quote(password, safe='')}"
        return f"postgresql://{credentials}@{host}:5432/{quote(database, safe='')}"
    return ""


class Settings(BaseModel):
    app_name: str = "SIGAC — Sistema de Gestão de Acesso ao Armazenamento Científico API"
    app_version: str = "3.1.0"
    database_engine: str = "postgresql"
    database_url: str = _database_url()
    cors_origins: list[str] = [
        x.strip()
        for x in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
        if x.strip()
    ]
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    cookie_name: str = os.getenv("COOKIE_NAME", "wayon_session_id")
    cookie_secure: bool = os.getenv(
        "COOKIE_SECURE",
        "true" if os.getenv("ENVIRONMENT", "development").lower() == "production" else "false",
    ).lower() == "true"
    session_hours: int = int(os.getenv("SESSION_HOURS", "8"))
    temporary_cav4_session: bool = os.getenv("TEMPORARY_CAV4_SESSION", "false").lower() == "true"
    email_login_enabled: bool = os.getenv(
        "EMAIL_LOGIN_ENABLED",
        "true" if os.getenv("ENVIRONMENT", "development").lower() != "production" else "false",
    ).lower() == "true"
    db_min_size: int = int(os.getenv("DB_MIN_SIZE", "1"))
    db_max_size: int = int(os.getenv("DB_MAX_SIZE", "10"))
    db_command_timeout: int = int(os.getenv("DB_COMMAND_TIMEOUT", "30"))
    db_ssl_verify: bool = os.getenv("DB_SSL_VERIFY", "true").lower() == "true"
    db_ssl_ca_file: str = os.getenv("DB_SSL_CA_FILE", "").strip()
    db_schema: str = os.getenv("DB_SCHEMA", "public").strip()
    api_prefix: str = os.getenv("API_PREFIX", "/api")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    environment: str = os.getenv("ENVIRONMENT", "development")
    expose_api_docs: bool = os.getenv(
        "EXPOSE_API_DOCS",
        "false" if os.getenv("ENVIRONMENT", "development").lower() == "production" else "true",
    ).lower() == "true"
    security_headers_enabled: bool = os.getenv("SECURITY_HEADERS_ENABLED", "true").lower() == "true"
    cookie_domain: str | None = os.getenv("COOKIE_DOMAIN") or None
    audit_retention_days: int = int(os.getenv("AUDIT_RETENTION_DAYS", "365"))
    entra_enabled: bool = os.getenv("ENTRA_ENABLED", "false").lower() == "true"
    entra_tenant_id: str = os.getenv("ENTRA_TENANT_ID", "")
    entra_client_id: str = os.getenv("ENTRA_CLIENT_ID", "")
    entra_client_secret: str = os.getenv("ENTRA_CLIENT_SECRET", "")
    entra_redirect_uri: str = os.getenv("ENTRA_REDIRECT_URI", "http://localhost:8080/api/auth/entra/callback")
    entra_scopes: str = os.getenv("ENTRA_SCOPES", "openid profile email User.Read GroupMember.Read.All")
    entra_groups: list[str] = Field(default_factory=lambda: _csv("ENTRA_GROUPS"))
    entra_group_sync_enabled: bool = os.getenv("ENTRA_GROUP_SYNC_ENABLED", "true").lower() == "true"
    cav4_enabled: bool = os.getenv("CAV4_ENABLED", "false").lower() == "true"
    cav4_base_url: str = os.getenv("CA_API_BASE_URL") or os.getenv("CAV4_BASE_URL", "")
    oidc_discovery_url: str = os.getenv("OIDC_DISCOVERY_URL", "")
    ca_ssl_use_truststore: bool = os.getenv(
        "CA_SSL_USE_TRUSTSTORE",
        "true" if os.getenv("ENVIRONMENT", "development").lower() == "production" else "false",
    ).lower() == "true"
    ca_ssl_cert_file: str = os.getenv("CA_SSL_CERT_FILE", "")
    ca_ssl_verify: bool = os.getenv(
        "CA_SSL_VERIFY",
        "true" if os.getenv("ENVIRONMENT", "development").lower() == "production" else "false",
    ).lower() == "true"
    # O CAV4 fornece o identificador como CA_CLIENT_ID; CAV4_CLIENT_ID
    # permanece aceito para compatibilidade com configurações anteriores.
    cav4_client_id: str = os.getenv("CA_CLIENT_ID") or os.getenv("CAV4_CLIENT_ID", "")
    cav4_client_secret: str = os.getenv("CA_CLIENT_SECRET") or os.getenv("CAV4_CLIENT_SECRET", "")
    cav4_redirect_uri: str = os.getenv("CA_REDIRECT_URI") or os.getenv("CAV4_REDIRECT_URI", "http://localhost:8080/api/auth/cav4/callback")
    cav4_scopes: str = os.getenv("CA_SCOPES") or os.getenv("CAV4_SCOPES", "openid profile email")
    cav4_jwt_leeway_seconds: int = int(os.getenv("CAV4_JWT_LEEWAY_SECONDS", "120"))
    cav4_authorization_url: str = os.getenv("CA_AUTHORIZATION_URL", "")
    cav4_token_url: str = os.getenv("CA_TOKEN_URL", "")
    cav4_userinfo_url: str = os.getenv("CA_USERINFO_URL", "")
    cav4_logout_url: str = os.getenv("CA_LOGOUT_URL", "")
    cav4_issuer: str = os.getenv("CA_ISSUER") or os.getenv("CAV4_ISSUER", "")
    cav4_jwks_url: str = os.getenv("CA_JWKS_URL", "")

    @model_validator(mode="after")
    def validate_entra(self) -> "Settings":
        if self.database_url and not self.database_url.startswith(("postgresql://", "postgres://", "postgresql+asyncpg://")):
            raise ValueError("DATABASE_URL/RDS_AURORA_POSTGRES_URL deve usar o esquema PostgreSQL/Aurora")
        if not self.database_url and not self.temporary_cav4_session:
            raise ValueError("DATABASE_URL/POSTGRES_URL ou RDS_AURORA_POSTGRES_URL/host/username/password são obrigatórias")
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", self.db_schema):
            raise ValueError("DB_SCHEMA deve conter apenas um identificador PostgreSQL válido")
        if self.db_min_size < 1 or self.db_max_size < self.db_min_size:
            raise ValueError("DB_MIN_SIZE e DB_MAX_SIZE possuem valores inválidos")
        if self.environment.lower() == "production":
            if not self.cookie_secure:
                raise ValueError("COOKIE_SECURE deve ser true em produção")
            if not self.cors_origins:
                raise ValueError("CORS_ORIGINS deve conter pelo menos uma origem")
        if any(origin == "*" for origin in self.cors_origins) and self.environment.lower() == "production":
            raise ValueError("CORS_ORIGINS não pode usar wildcard em produção")
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
        cav4_values = {
            "CA_CLIENT_ID": self.cav4_client_id, "CA_CLIENT_SECRET": self.cav4_client_secret,
            "CA_REDIRECT_URI": self.cav4_redirect_uri, "OIDC_DISCOVERY_URL": self.oidc_discovery_url,
        }
        if self.cav4_enabled:
            missing = [key for key, value in cav4_values.items() if not value.strip()]
            if missing:
                raise ValueError(f"Configuração CAV4 incompleta; faltando: {', '.join(missing)}")
            for key, value in cav4_values.items():
                if key.endswith("URL") and not value.startswith(("http://", "https://")):
                    raise ValueError(f"{key} deve começar com http:// ou https://")
            if self.environment.lower() == "production" and not self.ca_ssl_verify:
                raise ValueError("CA_SSL_VERIFY deve ser true em produção")
            if self.ca_ssl_cert_file and not Path(self.ca_ssl_cert_file).is_file():
                raise ValueError("CA_SSL_CERT_FILE aponta para um arquivo inexistente")
        return self


def _csv(name: str) -> list[str]:
    return [item.strip() for item in os.getenv(name, "").split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
