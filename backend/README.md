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
# confira se o banco está pronto
docker compose -f docker-compose.local.yml ps
```

O schema é aplicado automaticamente apenas na primeira criação do volume. Se o volume já existia, recrie-o antes de subir o banco:

```bash
docker compose -f docker-compose.local.yml down -v
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

Se precisar aplicar o schema manualmente (por exemplo, sem recriar o volume), use o `psql` dentro do container — assim não é necessário instalar o cliente PostgreSQL na máquina:

```bash
docker exec -i armazenamento-cientifico-postgres psql -U armazenamento -d armazenamento_cientifico < ../database/projects-schema.sql
```

A URL `postgresql+asyncpg://...` é usada pela aplicação Python; o comando `psql` usa o esquema `postgresql://...`.

## Autorização por perfil (RBAC)

As rotas protegidas validam a sessão no backend e nunca confiam no perfil enviado pelo frontend. Os perfis oficiais são:

- **Administrador (`admin`)**: acesso total, incluindo alteração de perfis.
- **Gerente (`gerente`)**: operações de gestão permitidas, sem alterar perfis de usuários.
- **Patrocinador (`patrocinador`)**: somente leitura.
- **Auditor (`auditor`)**: somente leitura, incluindo logs de auditoria.

Perfis legados continuam aceitos para compatibilidade: `gestor` é tratado como `gerente`, `participante` como `gerente` e `visualizador` como `auditor`. Uma requisição sem sessão retorna `401`; uma requisição autenticada sem permissão retorna `403`.

## Autorização por perfil (RBAC)

As rotas protegidas validam a sessão no backend e nunca confiam no perfil enviado pelo frontend. A matriz de rota é:

- **Administrador (`admin`)**: acesso total, incluindo alteração de perfis.
- **Gerente (`gerente`)**: operações de gestão, sem alterar perfis de usuários.
- **Patrocinador (`patrocinador`)**: somente leitura.
- **Auditor (`auditor`)**: somente leitura, incluindo consulta de auditoria.

Os perfis legados continuam compatíveis: `gestor` é tratado como `gerente`, `participante` como `gerente` e `visualizador` como `auditor`. Requisições sem sessão retornam `401`; usuários autenticados sem autorização retornam `403`.

## Migrações de banco com Alembic

O Alembic usa `DATABASE_URL` do `backend/.env` e carrega os modelos SQLAlchemy registrados em `app/db/base.py`. O schema legado continua sendo aplicado pelo script SQL do Docker; a migration `0001_baseline` apenas registra esse ponto inicial sem recriar ou apagar tabelas.

Após subir o PostgreSQL e ativar o ambiente virtual:

```bash
cd backend
source .venv/bin/activate             # Windows PowerShell: .venv\\Scripts\\Activate.ps1
python -m alembic current
python -m alembic upgrade head
```

Para criar uma nova migration após alterar modelos:

```bash
python -m alembic revision --autogenerate -m "descreva a alteração"
python -m alembic upgrade head
```

Revise sempre o arquivo gerado antes de aplicar em qualquer ambiente. Comandos úteis:

```bash
python -m alembic history
python -m alembic downgrade -1
python -m alembic check
```

Com `uv`, use `uv run alembic` no lugar de `python -m alembic`.

## Executar a API sem `uv` (forma padrão)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate             # Windows PowerShell: .venv\\Scripts\\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Executar com `uv` (alternativa)

```bash
cd backend
uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Para parar o banco sem remover os dados:

```bash
docker compose -f docker-compose.local.yml stop
```

Para remover também o volume local:

```bash
docker compose -f docker-compose.local.yml down -v
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
