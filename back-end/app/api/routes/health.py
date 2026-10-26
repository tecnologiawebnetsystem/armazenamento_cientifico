import logging
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import ArgumentError, SQLAlchemyError

from app.core.config import settings
from app.core.database_diagnostics import (
    DatabaseConfigurationDiagnostic,
    database_configuration_diagnostic,
)
from app.db import session as db_session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Health", "health"])
legacy_router = APIRouter(tags=["Health", "health"])


@router.get("/health/database/config")
async def database_config(response: Response) -> DatabaseConfigurationDiagnostic:
    """Configuração sem credenciais e teste real de conexão com SELECT 1."""
    response.headers["Cache-Control"] = "no-store"
    try:
        diagnostic = database_configuration_diagnostic(settings)
    except (ArgumentError, ValueError) as exc:
        logger.warning("database_config_diagnostic_failed error_type=%s", type(exc).__name__)
        raise HTTPException(
            status_code=503,
            detail={"code": "DATABASE_CONFIG_INVALID", "message": "Configuração de banco inválida."},
            headers={"Cache-Control": "no-store"},
        ) from exc
    diagnostic.database_probe = "SELECT 1"
    try:
        await db_session.probe_database_connection()
    except (SQLAlchemyError, OSError, TimeoutError, RuntimeError) as exc:
        diagnostic.database = "unavailable"
        diagnostic.error_id = uuid4().hex[:12]
        response.status_code = 503
        logger.exception(
            "database_config_connection_failed error_id=%s error_type=%s",
            diagnostic.error_id,
            type(exc).__name__,
        )
    else:
        diagnostic.database = "connected"
    return diagnostic


@legacy_router.get("/health/database")
@router.get("/health/database")
async def health_database():
    """Verificação da conectividade com o banco de dados e status da migration."""
    try:
        db_session.configure_engine()
        if db_session.engine is None:
            raise RuntimeError("Configuração Aurora PostgreSQL não disponível")
        async with db_session.engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
            revision = await connection.scalar(text("SELECT version_num FROM alembic_version LIMIT 1"))
        return {
            "status": "ok",
            "service": "fastapi",
            "database": "connected",
            "database_engine": settings.database_engine,
            "database_probe": "SELECT 1",
            "alembic_revision": revision,
        }
    except Exception as exc:
        import logging

        logging.getLogger(__name__).warning(
            "database_readiness_failed error_type=%s", type(exc).__name__, exc_info=True
        )
        return JSONResponse(status_code=503, content={"status": "degradado", "service": "fastapi", "database": "unavailable", "database_engine": settings.database_engine})


@legacy_router.get("/health")
@router.get("/health")
async def health():
    """Health check rápido para infraestrutura (não depende de banco)."""
    return {"status": "ok", "service": "fastapi", "version": settings.app_version}
