from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.config import settings
from app.db import session as db_session

router = APIRouter(tags=["Health"])


@router.get("/health/live")
async def health_live():
    return {"status": "ok", "service": "fastapi", "version": settings.app_version}


@router.get("/health/ready")
async def health_ready():
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
            "database_engine": "postgresql",
            "database_probe": "SELECT 1",
            "alembic_revision": revision,
        }
    except Exception as exc:
        import logging

        logging.getLogger(__name__).warning(
            "database_readiness_failed error_type=%s", type(exc).__name__, exc_info=True
        )
        return JSONResponse(status_code=503, content={"status": "degradado", "service": "fastapi", "database": "unavailable", "database_engine": settings.database_engine})


@router.get("/health/database")
async def health_database():
    return await health_ready()


@router.get("/health")
async def health():
    return await health_ready()
