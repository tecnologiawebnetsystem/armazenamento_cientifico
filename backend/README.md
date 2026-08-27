# SIGAC Backend

API REST em FastAPI com SQLAlchemy assíncrono, migrations Alembic e SQLite para desenvolvimento local.

## Requisitos

- Python 3.11+
- `pip` ou `uv`

## Rodar localmente com SQLite

```bash
cd backend
python -m venv .venv

# Linux/macOS
source .venv/bin/activate
# Windows PowerShell
# .venv\Scripts\Activate.ps1

pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

No `.env`, use:

```env
DATABASE_ENGINE=sqlite
DATABASE_URL=sqlite+aiosqlite:///./data/sigac.db
SEED_DATABASE=true
```

Ao iniciar, o backend cria a pasta `backend/data`, aplica a estrutura e executa o seed idempotente. O banco contém os perfis, usuários, projetos, membros, recursos e logs iniciais do ambiente. O login é exclusivamente por e-mail: o endereço precisa existir na tabela de usuários.

Usuários iniciais:

| Nome | E-mail | Perfil |
|---|---|---|
| Kleber Goncalves | kleber.goncalves.prestserv@petrobras.com.br | administrador |
| Fabio Junior | fabio.j.lima.prestserv@petrobras.com.br | gerente |
| Jefferson Breno | jefferson.breno.prestserv@petrobras.com.br | auditor |
| Raisa Cananeia | raisa.moreira.prestserv@petrobras.com.br | patrocinador |

Para recriar o banco local, pare a API e remova apenas `backend/data/sigac.db`; depois execute novamente `alembic upgrade head` e inicie o servidor. Não versionar `.env` nem o arquivo SQLite.

## Trocar para PostgreSQL no servidor

Altere somente as variáveis de ambiente do servidor:

```env
DATABASE_ENGINE=postgres
DATABASE_URL=postgresql+asyncpg://usuario:senha@host:5432/sigac
SEED_DATABASE=false
```

Execute `alembic upgrade head` antes de iniciar a API. O seed é idempotente, mas em produção recomenda-se mantê-lo desabilitado depois da carga inicial controlada.

## Frontend

Configure o frontend para consumir exclusivamente o FastAPI:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

A documentação OpenAPI fica em `/docs`, ReDoc em `/redoc` e o health check em `/health`.

## Validação

```bash
python -m compileall -q app alembic
python -m pip check
pytest -q
ruff check .
```

Rotas principais: autenticação (`/api/auth/*`), usuários, projetos, arquivos, auditoria, relatórios, mapa de acessos, permissões e configurações. Todas as consultas de negócio passam pelo FastAPI e pelo banco configurado; não há fallback para dados mockados.
