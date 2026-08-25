# Armazenamento Científico — Backend

API REST em FastAPI para projetos, arquivos, acessos, relatórios e auditoria, com PostgreSQL.

## Requisitos

- Python 3.11+
- Docker e Docker Compose
- `uv` (recomendado) ou `pip`

## Banco local com Docker

A partir da pasta `backend`:

```bash
docker compose -f docker-compose.local.yml up -d
```

O PostgreSQL ficará disponível em `localhost:5432` com:

- Banco: `armazenamento_cientifico`
- Usuário: `armazenamento`
- Senha: `armazenamento`

Configure `backend/.env` usando `.env.example`. Para o banco local, use:

```env
DATABASE_URL=postgresql+asyncpg://armazenamento:armazenamento@localhost:5432/armazenamento_cientifico
```

Depois aplique o schema inicial (caso ainda não tenha sido aplicado):

```bash
psql "postgresql://armazenamento:armazenamento@localhost:5432/armazenamento_cientifico" -f ../database/projects-schema.sql
```

A URL `postgresql+asyncpg://...` é usada pela aplicação Python; o comando `psql` usa o esquema `postgresql://...`.

Para parar o banco sem remover os dados:

```bash
docker compose -f docker-compose.local.yml stop
```

Para remover também o volume local:

```bash
docker compose -f docker-compose.local.yml down -v
```

## Instalar e executar a API

```bash
cd backend
uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Alternativamente, com `pip`:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Swagger e contrato OpenAPI

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI JSON: http://localhost:8000/openapi.json
- Health check: http://localhost:8000/health

O OpenAPI reúne as rotas modulares já migradas (`users`, `projects`, `files` e `audit`) e as rotas legadas ainda mantidas durante a migração. O endpoint `/api/projects/layered` é um endpoint técnico de transição e não substitui ainda o contrato principal de projetos.

## Endpoints disponíveis

- Autenticação: `/api/auth/login`, `/api/auth/logout`, `/api/auth/session`
- Usuários: `/api/users`, `/api/users/{id}`
- Projetos: `/api/projects`, `/api/projects/{id}`, membros e `/api/projects/layered`
- Arquivos: `/api/files`, `/api/files/{id}`
- Compartilhamento: `/api/files/{id}/share`
- Auditoria: `/api/activity-logs`, `/api/activity-logs/export` e `/api/audit/logs`
- Relatórios: `/api/reports`
- Mapa de acesso: `/api/access-map`
- Administração: `/api/permissions` e `/api/settings`

A lista completa de operações e payloads está em `../docs/api-endpoints.md` e sempre pode ser conferida no Swagger gerado pela aplicação.

## Testes e qualidade

```bash
uv run pytest -q
uv run ruff check .
uv run ruff format --check .
```

O teste de integração PostgreSQL é ignorado quando `DATABASE_URL` não aponta para um banco acessível.

## Arquitetura

O backend segue organização por domínio e camadas:

`Router/Controller → Service → Repository → Infraestrutura`

Cada domínio em `app/modules/` mantém seus models, schemas, repository, service, controller e module. `app/core/` concentra configuração, exceções e infraestrutura; `app/common/` concentra componentes reutilizáveis. O código em `legacy_api.py` permanece temporário até a migração dos domínios restantes.

## Segurança e operação

Em produção, defina `COOKIE_SECURE=true`, use HTTPS, restrinja `CORS_ORIGINS`, não versiona `.env` e aplique migrations controladas. As queries do legado usam parâmetros; novas regras devem lançar exceções tipadas de `app/core/exceptions.py` e nunca expor detalhes sensíveis.
