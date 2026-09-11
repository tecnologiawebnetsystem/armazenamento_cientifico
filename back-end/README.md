# SIGAC Back-end

API do SIGAC, construída com FastAPI, SQLAlchemy, Alembic e PostgreSQL/SQLite.

## Desenvolvimento local

```bash
cp .env.example .env
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

No Windows PowerShell, ative o ambiente com `.venv\\Scripts\\Activate.ps1`. A API ficará disponível em `http://localhost:8080`.

## Docker e JFrog

O back-end possui imagem e Compose independentes do front-end. Copie `.env.example` para `.env`, informe o repositório Docker oficial e faça login localmente sem gravar o token no repositório:

```bash
cp .env.example .env
# edite JFROG_DOCKER_REPOSITORY e IMAGE_TAG
set -a; . ./.env; set +a
printf '%s' "$JFROG_TOKEN" | docker login "$JFROG_REGISTRY" --username "$JFROG_USER" --password-stdin
docker compose build
docker compose push
docker compose up -d
```

O Compose gera `${JFROG_REGISTRY}/${JFROG_DOCKER_REPOSITORY}/armazenamento-cientifico-back-end:${IMAGE_TAG}` e mantém o PostgreSQL local no mesmo Compose. Para executar uma imagem já publicada, use `docker compose pull` antes de `docker compose up -d`. A URL `jfrog.petrobras.dev.br/artifactory/api/pypi/.../simple` é exclusiva do PyPI e não deve ser usada para imagens Docker.

## Banco e migrations

Para subir a API com PostgreSQL:

```bash
docker compose up --build
```

As migrations devem ser executadas no ambiente configurado com:

```bash
alembic upgrade head
```

## Validação

```bash
pytest -q
```

## Estrutura

- `app/`: aplicação FastAPI, módulos, autenticação e regras de negócio.
- `alembic/`: migrations versionadas.
- `database/`: schemas SQL de referência.
- `scripts/`: utilitários de migração e documentação de dados.
- `tests/`: testes automatizados da API.

O front-end é executado separadamente em `../front-end` e deve usar `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`.
