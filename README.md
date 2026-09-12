# SIGAC — Armazenamento Científico

Sistema de Gestão de Acesso ao Armazenamento Científico (SIGAC), organizado em duas aplicações independentes:

- aplicação web na raiz: Next.js, React e TypeScript.
- [`back-end/`](back-end/): API FastAPI com SQLAlchemy, Alembic e SQLite/PostgreSQL.
- [`wiki-dev.md`](wiki-dev.md): documentação técnica consolidada do sistema.

## Execução rápida

### Aplicação web

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

Acesse `http://localhost:3000`. O Next.js está na raiz do repositório; não existe mais a pasta `front-end`.

### Back-end

```bash
cd back-end
cp .env.example .env
uv sync --dev
uv run alembic upgrade head
uv run uvicorn app.app:app --host 0.0.0.0 --port 8080 --reload

# Alternativa Windows sem uv: use Python 3.11–3.13
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

A API fica disponível em `http://localhost:8080`. Consulte `http://localhost:8080/docs` quando a documentação estiver habilitada.

## Containers

A aplicação web na raiz possui seu próprio `Dockerfile`, `docker-compose.yml`, `.dockerignore` e configuração de ambiente. O `back-end/` possui Dockerfile, Compose, dependências e documentação próprios. As imagens são construídas e publicadas separadamente no JFrog Artifactory.

O endpoint PyPI `jfrog.petrobras.dev.br/artifactory/api/pypi/pypi-group-all/simple` não deve ser usado como registry de imagens Docker.

## Banco de dados

O back-end usa SQLite por padrão para desenvolvimento local, com o arquivo `back-end/data/sigac.db`. PostgreSQL permanece disponível para ambientes compartilhados e produção, mediante configuração no `.env`.

### Ambientes e integrações

Os modelos `.env.example` da raiz e de `back-end/` estão organizados por aplicação. O Entra ID está preparado, mas desligado por padrão (`ENTRA_ENABLED=false`). O CAV4 está parametrizado como ponto de extensão e permanece desligado até receber contrato, endpoints e credenciais oficiais; nenhum segredo deve ser colocado no frontend ou versionado.

Para detalhes de arquitetura, rotas, endpoints, containers, banco, testes e troubleshooting, consulte [`wiki-dev.md`](wiki-dev.md), [`README.md`](README.md) e [`back-end/README.md`](back-end/README.md).
