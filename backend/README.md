# Armazenamento Científico — Backend

API REST em FastAPI para projetos, arquivos, acessos, relatórios e auditoria, usando PostgreSQL (compatível com Neon).

## Requisitos

- Python 3.11+
- PostgreSQL 14+ ou Docker
- `uv` (recomendado) ou `pip`

## Configuração local

```bash
cd backend
cp .env.example .env
# opção local
 docker compose -f docker-compose.local.yml up -d
# aplicar o schema
psql "$DATABASE_URL" -f ../database/projects-schema.sql
uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Se usar `pip`, crie um ambiente virtual e execute `pip install -e .`; depois inicie com `uvicorn main:app --reload --port 8000`. Para Neon, mantenha todas as variáveis e substitua somente `DATABASE_URL` pela connection string da integração.

## Documentação e saúde

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI JSON: http://localhost:8000/openapi.json
- Health check: http://localhost:8000/health

O Swagger é gerado diretamente pelos decorators e modelos Pydantic da aplicação. Ele documenta os endpoints `/api/auth`, `/api/projects`, `/api/files`, `/api/users`, `/api/activity-logs`, `/api/reports` e `/api/access-map`.

## Testes e qualidade

```bash
uv run pytest -q
uv run ruff check .
uv run ruff format --check .
```

O teste de integração PostgreSQL é executado somente quando `DATABASE_URL` aponta para um banco acessível; caso contrário, é marcado como `skip`.

## Segurança e operação

Todas as rotas, exceto login e health, exigem sessão via cookie HttpOnly. A API aplica autorização por perfil e escopo de projeto, queries parametrizadas, CORS configurável e auditoria. Em produção, defina `COOKIE_SECURE=true`, use HTTPS, restrinja `CORS_ORIGINS`, não versiona `.env` e configure backups/migrações controladas do PostgreSQL.
