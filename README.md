# SIGAC — Armazenamento Científico

Sistema de Gestão de Acesso ao Armazenamento Científico (SIGAC), organizado em duas aplicações independentes:

- [``](): aplicação web Next.js, React e TypeScript.
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
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

A API fica disponível em `http://localhost:8080`. Consulte `http://localhost:8080/docs` quando a documentação estiver habilitada.

## Containers

A aplicação web na raiz possui seu próprio `Dockerfile`, `docker-compose.yml`, `.dockerignore` e configuração de ambiente. O `back-end/` possui Dockerfile, Compose, dependências e documentação próprios. As imagens são construídas e publicadas separadamente no JFrog Artifactory.

O endpoint PyPI `jfrog.petrobras.dev.br/artifactory/api/pypi/pypi-group-all/simple` não deve ser usado como registry de imagens Docker.

## Banco de dados

O back-end usa SQLite por padrão para desenvolvimento local, com o arquivo `back-end/data/sigac.db`. PostgreSQL permanece disponível para ambientes compartilhados e produção, mediante configuração no `.env`.

Para detalhes de arquitetura, rotas, endpoints, containers, banco, testes e troubleshooting, consulte [`wiki-dev.md`](wiki-dev.md), [`README.md`](README.md) e [`back-end/README.md`](back-end/README.md).
