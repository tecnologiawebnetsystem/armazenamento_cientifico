from typing import Literal

from pydantic import BaseModel
from sqlalchemy.engine import make_url

from app.core.config import Settings


class DatabaseConnectionValues(BaseModel):
    host: str | None
    port: int | None
    database: str | None
    username_configured: bool
    password_configured: bool


class DatabaseSeparateValues(BaseModel):
    host: str | None
    database: str | None
    username_configured: bool
    password_configured: bool


class DatabaseConfigurationDiagnostic(BaseModel):
    database_engine: str
    database_url_configured: bool
    effective: DatabaseConnectionValues
    separate_variables: DatabaseSeparateValues
    schema_name: str | None
    ssl_verify: bool | None
    temporary_cav4_session: bool
    database: Literal["not_checked", "connected", "unavailable"] = "not_checked"
    database_probe: str | None = None
    error_id: str | None = None


def database_configuration_diagnostic(config: Settings) -> DatabaseConfigurationDiagnostic:
    url = make_url(config.database_url) if config.database_url else None
    return DatabaseConfigurationDiagnostic(
        database_engine=config.database_engine,
        database_url_configured=bool(config.database_url),
        effective=DatabaseConnectionValues(
            host=url.host if url else None,
            port=(url.port or 5432) if url and not config.is_sqlite else None,
            database=url.database if url else None,
            username_configured=bool(url and url.username),
            password_configured=bool(url and url.password),
        ),
        separate_variables=DatabaseSeparateValues(
            host=config.aurora_host or None,
            database=config.aurora_database or None,
            username_configured=bool(config.aurora_user),
            password_configured=bool(config.aurora_password),
        ),
        schema_name=None if config.is_sqlite else config.db_schema,
        ssl_verify=None if config.is_sqlite else config.db_ssl_verify,
        temporary_cav4_session=config.temporary_cav4_session,
    )
