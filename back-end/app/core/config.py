import logging
import re
from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict
from sqlalchemy.engine import URL, make_url

PROJECT_ROOT = Path(__file__).resolve().parents[2]
logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(PROJECT_ROOT / ".env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
        hide_input_in_errors=True,
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
    aurora_port: int = Field(
        default=5432, ge=1, le=65535,
        validation_alias=AliasChoices("RDS_AURORA_POSTGRES_PORT", "POSTGRES_PORT", "PGPORT"),
    )
    aurora_user: str = Field(default="", validation_alias=AliasChoices("RDS_AURORA_POSTGRES_USERNAME", "RDS_AURORA_POSTGRES_USER", "POSTGRES_USER", "PGUSER"))
    aurora_password: str = Field(default="", validation_alias=AliasChoices("RDS_AURORA_POSTGRES_PASSWORD", "POSTGRES_PASSWORD", "PGPASSWORD"))
    aurora_database: str = Field(default="", validation_alias=AliasChoices("RDS_AURORA_POSTGRES_DATABASE", "RDS_AURORA_POSTGRES_DB", "RDS_AURORA_POSTGRES_DBNAME", "POSTGRES_DATABASE", "PGDATABASE"))
    cors_origins: Annotated[list[str], NoDecode] = Field(default_factory=lambda: ["http://localhost:3000"])
    frontend_url: str = "http://localhost:3000"
    cookie_name: str = "wayon_session_id"
    cookie_secure: bool = False
    session_hours: int = 8
    temporary_cav4_session: bool = False
    email_login_enabled: bool = Field(
        default=True,
        validation_alias=AliasChoices(
            "EMAIL_LOGIN_ENABLED",
            "EMAIL_LOGIN_ENABLE",
            "email.login.enable",
            "NEST_PUBLIC_EMAIL_LOGIN_ENABLED",
            "NEST_PUBLIC_EMAIL_LOGIN_ENABLE",
            "nest.public.email.login.enable",
        ),
    )
    db_min_size: int = 1
    db_max_size: int = 10
    db_command_timeout: int = Field(default=30, gt=0)
    db_ssl_verify: bool = True
    db_ssl_ca_file: str = ""
    db_schema: str = "a25034"
    api_prefix: str = "/api"
    log_level: str = "INFO"
    environment: str = "development"
    # A documentação da API fica desativada por padrão; habilite apenas em ambientes controlados.
    expose_api_docs: bool = False
    security_headers_enabled: bool = True
    cookie_domain: str | None = None
    audit_retention_days: int = 365
    cav4_enabled: bool = False
    cav4_base_url: str = Field(default="", validation_alias=AliasChoices("CA_API_BASE_URL", "CAV4_BASE_URL"))
    oidc_discovery_url: str = ""
    ca_ssl_use_truststore: bool = False
    ca_ssl_cert_file: str = ""
    # A validação TLS deve permanecer ativa; desligá-la exige configuração explícita.
    ca_ssl_verify: bool = True
    cav4_client_id: str = Field(default="", validation_alias=AliasChoices("CA_CLIENT_ID", "CAV4_CLIENT_ID"))
    cav4_client_secret: str = Field(default="", validation_alias=AliasChoices("CA_CLIENT_SECRET", "CAV4_CLIENT_SECRET"))
    cav4_redirect_uri: str = Field(default="http://localhost:8080/api/auth/cav4/callback", validation_alias=AliasChoices("CA_REDIRECT_URI", "CAV4_REDIRECT_URI"))
    cav4_scopes: str = Field(default="openid profile email", validation_alias=AliasChoices("CA_SCOPES", "CAV4_SCOPES"))
    cav4_jwt_leeway_seconds: int = 120
    cav4_authorization_url: str = ""
    cav4_token_url: str = ""
    cav4_userinfo_url: str = ""
    cav4_resources_url: str = Field(default="/api/admin/users/{userLogin}/roles", validation_alias=AliasChoices("CA_RESOURCES_URL", "CAV4_RESOURCES_URL"))
    cav4_logout_url: str = ""
    cav4_issuer: str = Field(default="", validation_alias=AliasChoices("CA_ISSUER", "CAV4_ISSUER"))
    cav4_jwks_url: str = ""
    entra_tenant_id: str = ""
    entra_client_id: str = ""
    entra_client_secret: str = ""

    @property
    def is_sqlite(self) -> bool:
        return self.database_engine == "sqlite"

    @model_validator(mode="before")
    @classmethod
    def normalize_environment_values(cls, values: dict) -> dict:
        data = dict(values or {})
        env = str(data.get("environment") or "development").lower()
        if not data.get("cors_origins"):
            data["cors_origins"] = ["http://localhost:3000"]
        elif isinstance(data["cors_origins"], str):
            data["cors_origins"] = [x.strip() for x in data["cors_origins"].split(",") if x.strip()]
        data.setdefault("cookie_secure", env == "production")
        data.setdefault("email_login_enabled", env != "production")
        data.setdefault("expose_api_docs", env != "production")
        data.setdefault("ca_ssl_use_truststore", env == "production")
        data.setdefault("ca_ssl_verify", True)
        return data

    @model_validator(mode="after")
    def validate_settings(self) -> "Settings":
        sqlite_schemes = ("sqlite://", "sqlite+aiosqlite://")
        # Resolve aliases first, then give the complete separate configuration priority.
        if (
            not self.database_url.startswith(sqlite_schemes)
            and self.aurora_host
            and self.aurora_user
            and self.aurora_password
            and self.aurora_database
        ):
            if self.database_url:
                logger.warning(
                    "database_configuration source=separate_variables url_override_ignored=true"
                )
            self.database_url = URL.create(
                "postgresql",
                username=self.aurora_user,
                password=self.aurora_password,
                host=self.aurora_host,
                port=self.aurora_port,
                database=self.aurora_database,
            ).render_as_string(hide_password=False)
        if self.database_url and "://" not in self.database_url:
            endpoint = make_url(f"postgresql://{self.database_url}")
            if not endpoint.host or endpoint.username is not None or endpoint.query:
                raise ValueError("DATABASE_URL sem esquema deve conter somente host, porta e banco opcionais.")
            required = {
                "RDS_AURORA_POSTGRES_USERNAME": self.aurora_user,
                "RDS_AURORA_POSTGRES_PASSWORD": self.aurora_password,
                "RDS_AURORA_POSTGRES_DBNAME": endpoint.database or self.aurora_database,
            }
            missing = [name for name, value in required.items() if not value]
            if missing:
                raise ValueError(f"DATABASE_URL sem esquema requer: {', '.join(missing)}.")
            self.database_url = URL.create(
                "postgresql",
                username=self.aurora_user,
                password=self.aurora_password,
                host=endpoint.host,
                port=endpoint.port or self.aurora_port,
                database=endpoint.database or self.aurora_database,
            ).render_as_string(hide_password=False)
        elif self.database_url and "://" in self.database_url:
            # URL com esquema mas sem credenciais (ex.: postgres://host:port/db
            # fornecido como endpoint). Injeta as credenciais das variáveis
            # separadas apenas para URLs PostgreSQL; SQLite é ignorado.
            _pg_schemes = ("postgresql://", "postgres://", "postgresql+asyncpg://", "postgresql+psycopg://")
            if self.database_url.startswith(_pg_schemes):
                parts = make_url(self.database_url)
                if parts.username is None and self.aurora_user and self.aurora_password:
                    self.database_url = parts.set(
                        username=self.aurora_user, password=self.aurora_password,
                    ).render_as_string(hide_password=False)
        postgres_schemes = ("postgresql://", "postgres://", "postgresql+asyncpg://", "postgresql+psycopg://")
        if self.database_url.startswith("sqlite://"):
            # O engine é assíncrono: a forma curta sqlite:/// ganha o driver aiosqlite.
            self.database_url = self.database_url.replace("sqlite://", "sqlite+aiosqlite://", 1)
        if self.database_url and not self.database_url.startswith((*postgres_schemes, *sqlite_schemes)):
            raise ValueError("DATABASE_URL/RDS_AURORA_POSTGRES_URL deve usar o esquema PostgreSQL/Aurora (padrão) ou SQLite (sqlite+aiosqlite://)")
        if not self.database_url and not self.temporary_cav4_session:
            required = {
                "RDS_AURORA_POSTGRES_HOST": self.aurora_host,
                "RDS_AURORA_POSTGRES_USERNAME": self.aurora_user,
                "RDS_AURORA_POSTGRES_PASSWORD": self.aurora_password,
                "RDS_AURORA_POSTGRES_DBNAME": self.aurora_database,
            }
            missing = [name for name, value in required.items() if not value]
            raise ValueError(
                "Configuração PostgreSQL ausente. Defina RDS_AURORA_POSTGRES_URL "
                f"ou complete: {', '.join(missing)}."
            )
        # PostgreSQL é o padrão do projeto; SQLite é uma alternativa opcional só para desenvolvimento local.
        self.database_engine = "sqlite" if self.database_url.startswith(sqlite_schemes) else "postgresql"
        if not self.is_sqlite and (not self.db_schema or not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", self.db_schema)):
            raise ValueError("DB_SCHEMA é obrigatório e deve conter um identificador PostgreSQL válido")
        if self.db_min_size < 1 or self.db_max_size < self.db_min_size:
            raise ValueError("DB_MIN_SIZE e DB_MAX_SIZE possuem valores inv��lidos")
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
