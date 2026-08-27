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
from app.core.logging import configure_logging, set_request_context

configure_logging(settings.log_level)
from app.db.session import connect, disconnect
from app.legacy_api import app as legacy_app

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    await connect()
    yield
    await disconnect()


def create_app() -> FastAPI:
    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="API REST para gestão de projetos científicos, arquivos, acessos, relatórios e auditoria.",
        lifespan=lifespan,
        docs_url="/docs" if settings.expose_api_docs else None,
        redoc_url="/redoc" if settings.expose_api_docs else None,
        openapi_url="/openapi.json" if settings.expose_api_docs else None,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "X-Correlation-ID"],
        max_age=600,
    )

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
        set_request_context(request_id)
        try:
            response = await call_next(request)
        except Exception:
            logger.exception("request_failed method=%s path=%s", request.method, request.url.path)
            raise
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        response.headers["X-Correlation-ID"] = request_id
        if settings.security_headers_enabled:
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
            if settings.environment.lower() == "production":
                response.headers["Strict-Transport-Security"] = "max-age=63072000"
        logger.info(
            "request_complete method=%s path=%s status=%s duration_ms=%s client=%s",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            request.client.host if request.client else "-",
        )
        return response

    @application.exception_handler(AppException)
    async def app_exception_handler(_: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.error_code, "message": exc.message, "details": exc.details},
        )

    @application.exception_handler(RequestValidationError)
    async def validation_exception_handler(_: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "error": "ValidationError",
                "message": "Dados de entrada inválidos",
                "details": {"fields": exc.errors()},
            },
        )

    @application.get("/health", tags=["Health"])
    async def health():
        return {
            "status": "ok" if settings.database_url else "degradado",
            "service": "fastapi",
            "version": settings.app_version,
            "database": "configured" if settings.database_url else "not_configured",
        }

    # O legado é o contrato HTTP canônico durante a integração frontend/backend.
    # Ele expõe os endpoints consumidos pelo cliente TypeScript, com respostas
    # compatíveis e autorização baseada na sessão PostgreSQL.
    application.mount("/", legacy_app)

    # Aplicações montadas não propagam automaticamente seus paths para o schema
    # principal. Mesclamos o contrato legado durante a migração, sem duplicar rotas.
    default_openapi = application.openapi

    def openapi_with_legacy_paths():
        if application.openapi_schema:
            return application.openapi_schema
        schema = default_openapi()
        legacy_schema = legacy_app.openapi()
        for path, path_item in legacy_schema.get("paths", {}).items():
            schema["paths"].setdefault(path, path_item)

        # Rotas de uma aplicação montada mantêm referências locais, como
        # #/components/schemas/Login. Ao mesclar somente os paths, Swagger UI
        # não encontra esses schemas no documento OpenAPI principal.
        components = schema.setdefault("components", {})
        for component_group, values in legacy_schema.get("components", {}).items():
            target_group = components.setdefault(component_group, {})
            for name, value in values.items():
                target_group.setdefault(name, value)

        application.openapi_schema = schema
        return schema

    application.openapi = openapi_with_legacy_paths
    return application
