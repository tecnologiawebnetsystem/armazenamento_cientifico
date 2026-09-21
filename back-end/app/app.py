import logging
from contextlib import asynccontextmanager
from time import perf_counter
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.api.routes.cav4_auth import email_router as email_auth_router
from app.api.routes.cav4_auth import router as cav4_auth_router
from app.api.routes.cav4_directory import router as cav4_directory_router
from app.api.routes.health import router as health_router
from app.core.config import settings
from app.core.exceptions import AppException
from app.core.logging import configure_logging, reset_request_id, set_request_id
from app.db.session import connect, disconnect

configure_logging(settings.log_level)
from app.modules.files.module import router as folders_router
from app.modules.platform.controller import router as platform_router
from app.modules.projects.module import router as projects_router
from app.modules.reports.controller import router as reports_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info(
        "[DIAGNOSTIC] application_startup database_engine=%s migrations=alembic startup_schema_mutation=false cav4_enabled=%s ca_ssl_verify=%s ca_ssl_truststore=%s db_ssl_verify=%s frontend_url=%s",
        settings.database_engine,
        settings.cav4_enabled,
        settings.ca_ssl_verify,
        settings.ca_ssl_use_truststore,
        settings.db_ssl_verify,
        settings.frontend_url,
    )
    try:
        await connect()
    except (SQLAlchemyError, OSError, RuntimeError) as exc:
        logger.warning("application_startup database_connection=unavailable error=%s", type(exc).__name__)
    else:
        logger.info("application_ready database_connection=ok")
    try:
        yield
    finally:
        await disconnect()
        logger.info("application_shutdown complete=true")


API_DESCRIPTION = """
API REST do **SIGAC — Sistema de Gestão de Acesso ao Armazenamento Científico**.
""".strip()

TAGS_METADATA = [
    {"name": "Health", "description": "Verificação de disponibilidade da API e do banco."},
    {"name": "Authentication", "description": "Login local, logout, sessão e integração corporativa CAV4."},
    {"name": "Projects", "description": "Cadastro, consulta, atualização e membros de projetos."},
    {"name": "Folders", "description": "Consulta somente leitura das pastas vinculadas a projetos."},
    {"name": "Dashboard", "description": "Indicadores executivos e visão consolidada do portfólio."},
    {"name": "Reports", "description": "Relatórios, exportações e filtros analíticos."},
    {"name": "Directory", "description": "Usuários e catálogos disponíveis ao usuário autenticado."},
    {"name": "Security", "description": "Permissões, configurações e solicitações de acesso."},
    {"name": "Audit", "description": "Logs de auditoria e exportações administrativas."},
]


def create_app() -> FastAPI:
    application = FastAPI(title=settings.app_name, version=settings.app_version, description=API_DESCRIPTION, openapi_tags=TAGS_METADATA, lifespan=lifespan, docs_url="/docs" if settings.expose_api_docs else None, redoc_url="/redoc" if settings.expose_api_docs else None, openapi_url="/openapi.json" if settings.expose_api_docs else None)
    application.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True, allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"], allow_headers=["Content-Type", "Authorization", "X-Request-ID"], max_age=600)

    @application.middleware("http")
    async def request_security_and_logging(request: Request, call_next: Any):
        started_at = perf_counter()
        request_id = request.headers.get("X-Request-ID", str(uuid4()))
        context_token = set_request_id(request_id)
        logger.info("request_start method=%s path=%s", request.method, request.url.path)
        response = await call_next(request)
        if settings.security_headers_enabled:
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
            if settings.environment.lower() == "production":
                response.headers["Strict-Transport-Security"] = "max-age=63072000"
        response.headers["X-Request-ID"] = request_id
        logger.info("request_complete method=%s path=%s status=%s duration_ms=%.2f", request.method, request.url.path, response.status_code, (perf_counter() - started_at) * 1000)
        reset_request_id(context_token)
        return response

    @application.exception_handler(AppException)
    async def app_exception_handler(_: Request, exc: AppException):
        return JSONResponse(status_code=exc.status_code, content={"error": exc.error_code, "message": exc.message, "details": exc.details})

    @application.exception_handler(RequestValidationError)
    async def validation_exception_handler(_: Request, exc: RequestValidationError):
        return JSONResponse(status_code=422, content={"error": "ValidationError", "message": "Dados de entrada inválidos", "details": {"fields": exc.errors()}})

    @application.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception("unhandled_request_error method=%s path=%s", request.method, request.url.path)
        message = "Erro interno do servidor" if settings.environment.lower() == "production" else str(exc)
        return JSONResponse(status_code=500, content={"error": "InternalError", "message": message, "details": {}})

    application.include_router(health_router)
    application.include_router(cav4_auth_router)
    application.include_router(email_auth_router)
    application.include_router(cav4_directory_router)

    application.include_router(projects_router)
    application.include_router(folders_router)
    application.include_router(platform_router)
    application.include_router(reports_router)
    from app.modules.audit.controller import router as audit_router
    application.include_router(audit_router)
    return application


app = create_app()
