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
app.description = (
    'API REST para gestão de projetos científicos, arquivos, acessos, '
    'relatórios e trilha de auditoria.'
)
app.openapi_tags = [
    {'name': 'Health', 'description': 'Verificação de disponibilidade da API e do PostgreSQL.'},
    {'name': 'Auth', 'description': 'Login, sessão e logout.'},
    {'name': 'Projects', 'description': 'Projetos, membros e permissões de projeto.'},
    {'name': 'Files', 'description': 'Pastas, arquivos e compartilhamentos.'},
    {'name': 'Reports', 'description': 'Consultas, indicadores e mapa de acessos.'},
    {'name': 'Administration', 'description': 'Usuários, auditoria e configurações.'},
]

@app.on_event('startup')
async def startup_database() -> None:
    await connect()

@app.on_event('shutdown')
async def shutdown_database() -> None:
    await disconnect()

# Mantém CORS centralizado na composição da aplicação.
if not any(getattr(m, 'cls', None) is CORSMiddleware for m in app.user_middleware):
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True, allow_methods=['*'], allow_headers=['*'])
