# SIGAC — Armazenamento Científico

Sistema de Gestão de Acesso ao Armazenamento Científico (SIGAC), organizado em duas aplicações independentes:

- [`front-end/`](front-end/): aplicação web Next.js, React e TypeScript.
- [`back-end/`](back-end/): API FastAPI com SQLAlchemy, Alembic e SQLite/PostgreSQL.
- [`wiki-dev.md`](wiki-dev.md): documentação técnica consolidada do sistema.

## Execução rápida

### Front-end

```bash
cd front-end
cp .env.example .env.local
pnpm install
pnpm dev
```

Acesse `http://localhost:3000`.

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

Cada aplicação possui seu próprio `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.gitignore` e README. O front-end e o back-end devem ser construídos e publicados separadamente no JFrog Artifactory, usando `JFROG_REGISTRY`, `JFROG_DOCKER_REPOSITORY`, `IMAGE_TAG`, `JFROG_USER` e `JFROG_TOKEN` conforme os exemplos de ambiente de cada aplicação.

O endpoint PyPI `jfrog.petrobras.dev.br/artifactory/api/pypi/pypi-group-all/simple` não deve ser usado como registry de imagens Docker.

## Banco de dados

O back-end usa SQLite por padrão para desenvolvimento local, com o arquivo `back-end/data/sigac.db`. PostgreSQL permanece disponível para ambientes compartilhados e produção, mediante configuração no `.env`.

Para detalhes de arquitetura, rotas, endpoints, containers, banco, testes e troubleshooting, consulte [`wiki-dev.md`](wiki-dev.md), [`front-end/README.md`](front-end/README.md) e [`back-end/README.md`](back-end/README.md).
