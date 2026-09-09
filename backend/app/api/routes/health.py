from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.legacy_api import database_probe

router = APIRouter(tags=["Health"])


@router.get("/health/live")
async def health_live():
    return {"status": "ok", "service": "fastapi", "version": settings.app_version}


@router.get("/health/ready")
async def health_ready():
    try:
        probe = await database_probe()
        return {"status": "ok", "service": "fastapi", "database": "connected", "database_engine": settings.database_engine, "database_probe": probe}
    except (OSError, RuntimeError):
        return JSONResponse(status_code=503, content={"status": "degradado", "service": "fastapi", "database": "unavailable", "database_engine": settings.database_engine})


@router.get("/health/database")
async def health_database():
    return await health_ready()


@router.get("/health")
async def health():
    return await health_ready()
