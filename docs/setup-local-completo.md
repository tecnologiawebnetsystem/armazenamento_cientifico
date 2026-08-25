# SIGAC — execução local completa

## Escopo

Este documento descreve o ambiente local do SIGAC — Sistema de Gestão de Acesso ao Armazenamento Científico: PostgreSQL, backend FastAPI e frontend Next.js.

## Pré-requisitos

- Node.js 20+ e npm 10+
- Python 3.11+
- Docker Desktop com Docker Compose
- Git

## 1. Clonar e instalar

```bash
git clone https://github.com/tecnologiawebnetsystem/armazenamento_cientifico.git
cd armazenamento_cientifico
npm ci
cd backend
python -m venv .venv
# Linux/macOS
source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..
```

## 2. Subir PostgreSQL

Na raiz:

```bash
docker compose up -d postgres
docker compose ps
docker compose logs -f postgres
```

O schema de `database/projects-schema.sql` é executado somente na primeira criação do volume. Para recriar o banco do zero:

```bash
docker compose down -v
docker compose up -d postgres
```

Atenção: `down -v` apaga os dados locais.

## 3. Configurar backend

```bash
cd backend
cp .env.example .env
```

Confirme no `.env`:

```dotenv
DATABASE_URL=postgresql+asyncpg://sigac:sigac_dev_password@localhost:5432/sigac
```

Execute a API:

```bash
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Verifique `http://localhost:8000/health` e `http://localhost:8000/docs`.

## 4. Configurar frontend

Na raiz, crie `.env.local`:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Execute:

```bash
npm run dev
```

Abra `http://localhost:3000`.

## 5. Testes e qualidade

Frontend:

```bash
npm run typecheck
npm run lint
npm run build
```

Backend:

```bash
cd backend
python -m compileall app
ruff check .
ruff format --check .
pytest -q
```

## 6. Schema e migrations

O schema SQL versionado em `database/projects-schema.sql` é a fonte de bootstrap local. A migration `0001_baseline` registra o schema legado e não recria tabelas. Antes de aplicar migrations novas, confirme que elas são compatíveis com esse schema e execute em banco descartável.

```bash
cd backend
alembic current
alembic history
alembic upgrade head
```

Não execute `alembic downgrade` em ambiente compartilhado sem backup.

## 7. Inspeção do banco

```bash
docker compose exec postgres psql -U sigac -d sigac
```

Dentro do psql:

```sql
\\dt
\\d projects
select count(*) from projects;
select version_num from alembic_version;
```

O diagrama atualizado está em `docs/database-erd.mmd`. O schema detalhado está em `database/projects-schema.sql`.

## 8. Troubleshooting

- Porta 5432 ocupada: altere o lado esquerdo de `5432:5432` no compose e ajuste `DATABASE_URL`.
- Banco vazio após alteração do SQL: remova o volume com `docker compose down -v` e suba novamente.
- Frontend não acessa API: confirme o `.env.local`, CORS e `/health`.
- Migration falha: compare `alembic history`, `alembic current` e o schema SQL antes de corrigir.
- Segredos: nunca versione `.env`, senhas, tokens ou arquivos de produção.

## 9. Ordem recomendada

1. `docker compose up -d postgres`
2. configurar e iniciar backend na porta 8000
3. validar `/health`
4. configurar `.env.local`
5. iniciar frontend na porta 3000
6. executar testes antes de abrir pull request
