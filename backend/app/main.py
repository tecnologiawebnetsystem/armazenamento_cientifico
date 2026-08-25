from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import connect, disconnect
from app.legacy_api import app as legacy_app

# A API legada é incluída durante a migração incremental para routers por domínio.
# O ponto de entrada público permanece app.main:app, evitando quebra no frontend.
app: FastAPI = legacy_app
app.title = settings.app_name
app.version = settings.app_version

@app.on_event('startup')
async def startup_database() -> None:
    await connect()

@app.on_event('shutdown')
async def shutdown_database() -> None:
    await disconnect()

# Mantém CORS centralizado na composição da aplicação.
if not any(getattr(m, 'cls', None) is CORSMiddleware for m in app.user_middleware):
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True, allow_methods=['*'], allow_headers=['*'])
