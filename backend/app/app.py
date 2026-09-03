import logging
import time
from contextlib import asynccontextmanager
from typing import Any
from uuid import UUID, uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.exceptions import AppException
from app.core.logging import configure_logging, reset_request_context, set_request_context

configure_logging(settings.log_level)
from app.db.session import connect, disconnect
from app.legacy_api import app as legacy_app
from app.modules.files.module import router as files_router
from app.modules.projects.module import router as projects_router
from app.modules.sql_manager.module import router as sql_manager_router
from app.modules.users.module import router as users_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("application_startup database_engine=%s", settings.database_engine)
    await connect()
    from app.legacy_api import shutdown as legacy_shutdown
    from app.legacy_api import startup as legacy_startup

    await legacy_startup()
    try:
        yield
    finally:
        await legacy_shutdown()
        await disconnect()
        logger.info("application_shutdown complete=true")


API_DESCRIPTION = """
API REST do **SIGAC — Sistema de Gestão de Acesso ao Armazenamento Científico**.
""".strip()

TAGS_METADATA = [
    {"name": "Health", "description": "Verificação de disponibilidade da API e do banco."},
    {"name": "SQL Manager", "description": "Consulta e manutenção controlada das tabelas do banco."},
]


def create_app() -> FastAPI:
    application = FastAPI(title=settings.app_name, version=settings.app_version, description=API_DESCRIPTION, openapi_tags=TAGS_METADATA, lifespan=lifespan, docs_url="/docs" if settings.expose_api_docs else None, redoc_url="/redoc" if settings.expose_api_docs else None, openapi_url="/openapi.json" if settings.expose_api_docs else None)
    application.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True, allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"], allow_headers=["Content-Type", "X-Correlation-ID"], max_age=600)

    @application.middleware("http")
    async def request_security_and_logging(request: Request, call_next: Any):
        raw_id = request.headers.get("X-Correlation-ID", "")
        try:
            request_id = str(UUID(raw_id)) if raw_id else str(uuid4())
        except ValueError:
            request_id = str(uuid4())
        if len(raw_id) > settings.request_log_max_id_length:
            request_id = str(uuid4())
        started = time.perf_counter()
        context_tokens = set_request_context(request_id)
        try:
            response = await call_next(request)
        finally:
            reset_request_context(context_tokens)
        response.headers["X-Correlation-ID"] = request_id
        if settings.security_headers_enabled:
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
            if settings.environment.lower() == "production":
                response.headers["Strict-Transport-Security"] = "max-age=63072000"
        logger.info("request_complete method=%s path=%s status=%s duration_ms=%s", request.method, request.url.path, response.status_code, round((time.perf_counter() - started) * 1000, 2))
        return response

    @application.exception_handler(AppException)
    async def app_exception_handler(_: Request, exc: AppException):
        return JSONResponse(status_code=exc.status_code, content={"error": exc.error_code, "message": exc.message, "details": exc.details})

    @application.exception_handler(RequestValidationError)
    async def validation_exception_handler(_: Request, exc: RequestValidationError):
        return JSONResponse(status_code=422, content={"error": "ValidationError", "message": "Dados de entrada inválidos", "details": {"fields": exc.errors()}})

    @application.get("/health", tags=["Health"])
    async def health():
        from app.legacy_api import database_probe
        try:
            probe = await database_probe()
            return {"status": "ok", "service": "fastapi", "version": settings.app_version, "database": "connected", "database_engine": settings.database_engine, "database_probe": probe}
        except Exception:
            return JSONResponse(status_code=503, content={"status": "degradado", "service": "fastapi", "version": settings.app_version, "database": "unavailable", "database_engine": settings.database_engine})

    application.include_router(sql_manager_router)
    application.include_router(projects_router)
    application.include_router(files_router)
    application.include_router(users_router)
    application.mount("/", legacy_app)

    default_openapi = application.openapi

    def openapi_with_legacy_paths():
        if application.openapi_schema:
            return application.openapi_schema
        schema = default_openapi()
        legacy_schema = legacy_app.openapi()
        for path, path_item in legacy_schema.get("paths", {}).items():
            schema["paths"].setdefault(path, path_item)
        components = schema.setdefault("components", {})
        for component_group, values in legacy_schema.get("components", {}).items():
            components.setdefault(component_group, {}).update(values)
        application.openapi_schema = schema
        return schema

    application.openapi = openapi_with_legacy_paths
    return application


app = create_app()
