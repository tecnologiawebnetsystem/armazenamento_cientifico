import re
from functools import lru_cache
from pathlib import Path
from urllib.parse import quote

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(PROJECT_ROOT / ".env", ".env"),
        env_file_encoding="utf-8",
        extra="allow",
        case_sensitive=False,
    )

    app_name: str = "SIGAC — Sistema de Gestão de Acesso ao Armazenamento Científico API"
    app_version: str = "3.1.0"
    database_engine: str = "postgresql"
    database_url: str = Field(
        default="",
        validation_alias=AliasChoices(
            "RDS_AURORA_POSTGRES_URL", "DATABASE_URL", "DATABASE_URL_UNPOOLED",
            "POSTGRES_URL", "POSTGRES_PRISMA_URL",
        ),
    )
    aurora_host: str = Field(default="", validation_alias=AliasChoices("RDS_AURORA_POSTGRES_HOST", "POSTGRES_HOST", "PGHOST"))
    aurora_user: str = Field(default="", validation_alias=AliasChoices("RDS_AURORA_POSTGRES_USERNAME", "RDS_AURORA_POSTGRES_USER", "POSTGRES_USER", "PGUSER"))
    aurora_password: str = Field(default="", validation_alias=AliasChoices("RDS_AURORA_POSTGRES_PASSWORD", "POSTGRES_PASSWORD", "PGPASSWORD"))
    aurora_database: str = Field(default="", validation_alias=AliasChoices("RDS_AURORA_POSTGRES_DATABASE", "RDS_AURORA_POSTGRES_DB", "POSTGRES_DATABASE", "PGDATABASE"))
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    frontend_url: str = "http://localhost:3000"
    cookie_name: str = "wayon_session_id"
    cookie_secure: bool = False
    session_hours: int = 8
    temporary_cav4_session: bool = False
    email_login_enabled: bool = True
    db_min_size: int = 1
    db_max_size: int = 10
    db_command_timeout: int = 30
    db_ssl_verify: bool = True
    db_ssl_ca_file: str = ""
    db_schema: str = ""
    api_prefix: str = "/api"
    log_level: str = "INFO"
    environment: str = "development"
    expose_api_docs: bool = True
    security_headers_enabled: bool = True
    cookie_domain: str | None = None
    audit_retention_days: int = 365
    cav4_enabled: bool = False
    cav4_base_url: str = Field(default="", validation_alias=AliasChoices("CA_API_BASE_URL", "CAV4_BASE_URL"))
    oidc_discovery_url: str = ""
    ca_ssl_use_truststore: bool = False
    ca_ssl_cert_file: str = ""
    ca_ssl_verify: bool = False
    cav4_client_id: str = Field(default="", validation_alias=AliasChoices("CA_CLIENT_ID", "CAV4_CLIENT_ID"))
    cav4_client_secret: str = Field(default="", validation_alias=AliasChoices("CA_CLIENT_SECRET", "CAV4_CLIENT_SECRET"))
    cav4_redirect_uri: str = Field(default="http://localhost:8080/api/auth/cav4/callback", validation_alias=AliasChoices("CA_REDIRECT_URI", "CAV4_REDIRECT_URI"))
    cav4_scopes: str = Field(default="openid profile email", validation_alias=AliasChoices("CA_SCOPES", "CAV4_SCOPES"))
    cav4_jwt_leeway_seconds: int = 120
    cav4_authorization_url: str = ""
    cav4_token_url: str = ""
    cav4_userinfo_url: str = ""
    cav4_logout_url: str = ""
    cav4_issuer: str = Field(default="", validation_alias=AliasChoices("CA_ISSUER", "CAV4_ISSUER"))
    cav4_jwks_url: str = ""

    @model_validator(mode="before")
    @classmethod
    def normalize_environment_values(cls, values: dict) -> dict:
        data = dict(values or {})
        env = str(data.get("environment") or "development").lower()
        if not data.get("cors_origins"):
            data["cors_origins"] = ["http://localhost:3000"]
        elif isinstance(data["cors_origins"], str):
            data["cors_origins"] = [x.strip() for x in data["cors_origins"].split(",") if x.strip()]
        if not data.get("database_url"):
            host = data.get("RDS_AURORA_POSTGRES_HOST") or data.get("POSTGRES_HOST") or data.get("PGHOST")
            user = data.get("RDS_AURORA_POSTGRES_USERNAME") or data.get("RDS_AURORA_POSTGRES_USER") or data.get("POSTGRES_USER") or data.get("PGUSER")
            password = data.get("RDS_AURORA_POSTGRES_PASSWORD") or data.get("POSTGRES_PASSWORD") or data.get("PGPASSWORD")
            database = data.get("RDS_AURORA_POSTGRES_DATABASE") or data.get("RDS_AURORA_POSTGRES_DB") or data.get("POSTGRES_DATABASE") or data.get("PGDATABASE")
            if host and user and password and database:
                data["database_url"] = f"postgresql://{quote(user, safe='')}:{quote(password, safe='')}@{host}:5432/{quote(database, safe='')}"
        data.setdefault("cookie_secure", env == "production")
        data.setdefault("email_login_enabled", env != "production")
        data.setdefault("expose_api_docs", env != "production")
        data.setdefault("ca_ssl_use_truststore", env == "production")
        data.setdefault("ca_ssl_verify", env == "production")
        return data

    @model_validator(mode="after")
    def validate_settings(self) -> "Settings":
        if not self.database_url and self.aurora_host and self.aurora_user and self.aurora_password and self.aurora_database:
            self.database_url = f"postgresql://{quote(self.aurora_user, safe='')}:{quote(self.aurora_password, safe='')}@{self.aurora_host}:5432/{quote(self.aurora_database, safe='')}"
        if self.database_url and not self.database_url.startswith(("postgresql://", "postgres://", "postgresql+asyncpg://", "postgresql+psycopg://")):
            raise ValueError("DATABASE_URL/RDS_AURORA_POSTGRES_URL deve usar o esquema PostgreSQL/Aurora")
        if not self.database_url and not self.temporary_cav4_session:
            raise ValueError("Configuração PostgreSQL ausente. Defina RDS_AURORA_POSTGRES_URL ou as variáveis PG/RDS_AURORA_POSTGRES_*.")
        if not self.db_schema or not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", self.db_schema):
            raise ValueError("DB_SCHEMA é obrigatório e deve conter um identificador PostgreSQL válido")
        if self.db_min_size < 1 or self.db_max_size < self.db_min_size:
            raise ValueError("DB_MIN_SIZE e DB_MAX_SIZE possuem valores inválidos")
        if self.environment.lower() == "production" and (
            self.temporary_cav4_session or self.email_login_enabled or not self.cookie_secure or not self.cors_origins
        ):
            raise ValueError("Configuração de segurança inválida para produção")
        if any(origin == "*" for origin in self.cors_origins) and self.environment.lower() == "production":
            raise ValueError("CORS_ORIGINS não pode usar wildcard em produção")
        if self.cav4_enabled:
            required = {"CA_CLIENT_ID": self.cav4_client_id, "CA_CLIENT_SECRET": self.cav4_client_secret, "CA_REDIRECT_URI": self.cav4_redirect_uri, "OIDC_DISCOVERY_URL": self.oidc_discovery_url}
            missing = [key for key, value in required.items() if not value.strip()]
            if missing:
                raise ValueError(f"Configuração CAV4 incompleta; faltando: {', '.join(missing)}")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
