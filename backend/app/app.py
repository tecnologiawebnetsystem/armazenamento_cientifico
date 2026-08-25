import logging
from contextlib import asynccontextmanager
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.exceptions import AppException
from app.db.session import connect, disconnect
from app.legacy_api import app as legacy_app
from app.modules.audit.module import router as audit_router
from app.modules.files.module import router as files_router
from app.modules.projects.module import router as projects_router
from app.modules.users.module import router as users_router

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
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.middleware("http")
    async def correlation_id(request: Request, call_next: Any):
        request_id = request.headers.get("X-Correlation-ID", str(uuid4()))
        response = await call_next(request)
        response.headers["X-Correlation-ID"] = request_id
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

    # Módulos novos são registrados antes do legado para permitir migração incremental.
    application.include_router(users_router)
    application.include_router(projects_router)
    application.include_router(files_router)
    application.include_router(audit_router)
    # Os endpoints existentes continuam disponíveis enquanto cada domínio é migrado.
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
        application.openapi_schema = schema
        return schema

    application.openapi = openapi_with_legacy_paths
    return application
