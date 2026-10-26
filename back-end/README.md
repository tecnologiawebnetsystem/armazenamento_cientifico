# SIGAC — Backend

API FastAPI do **SIGAC — Sistema de Gestão de Acesso ao Armazenamento Científico**. O backend concentra autenticação, autorização, regras de negócio, gerenciamento de projetos, membros, permissões de projeto, consulta de arquivos, relatórios, auditoria e persistência dos dados.

> 📖 **Documento de arquitetura completo:** [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md)

---

## Visão geral

O SIGAC é uma plataforma corporativa para controlar o acesso ao armazenamento de elementos científicos. O sistema centraliza projetos, arquivos, usuários, permissões e solicitações de acesso, garantindo que cada operação siga as regras de segurança e possa ser auditada.

| Componente | Descrição |
|-----------|-----------|
| **Backend** (este repositório) | API HTTP FastAPI — valida requisições, aplica regras de negócio, controla acesso e persiste dados |
| **Frontend** (`../frontend/`) | Interface web Next.js — consumida pelos usuários finais |

### Regras principais do sistema

- A autorização é aplicada no servidor e considera o usuário, o projeto e o nível de acesso solicitado.
- Um usuário só pode consultar ou alterar projetos, membros e arquivos para os quais possui permissão.
- Alterações relevantes, acessos e eventos de segurança devem ser registrados em auditoria.
- O backend é a fonte definitiva das regras de negócio; validações do frontend não substituem as validações da API.
- Segredos, tokens, credenciais e dados corporativos reais nunca devem ser versionados.

---

## Tecnologias

| Tecnologia | Versão |
|-----------|--------|
| Python | 3.11+ (imagem Docker com 3.12) |
| FastAPI | ≥0.115 |
| SQLAlchemy (async) | 2.0+ |
| PostgreSQL Aurora (via asyncpg) | asyncpg ≥0.29 |
| Alembic | 1.16+ |
| Pydantic v2 | 2.x |
| pydantic-settings | 2.x |
| pytest + pytest-asyncio | 9.x + 1.x |
| Docker + Compose | v2 |
| ruff (lint/formatter) | ≥0.8 |

---

## Instalação rápida

```bash
# Criar ambiente virtual
python -m venv .venv

# Ativar (Windows)
.venv\Scripts\activate

# Ativar (Linux/macOS)
source .venv/bin/activate

# Instalar dependências
pip install -r requirements.txt
```

---

## Configuração

Copie o arquivo de exemplo e ajuste para seu ambiente:

```bash
cp .env.example .env
```

O arquivo [`.env.example`](.env.example) está completamente documentado com todas as variáveis, aliases aceitos e avisos de segurança para produção.

### Formato de DATABASE_URL (3 cenários)

O `app/core/config.py` aceita 3 formatos para `DATABASE_URL` / `RDS_AURORA_POSTGRES_URL`:

| # | Formato | Exemplo | Quando usar |
|---|---------|---------|-------------|
| 1 | URL completa | `postgresql://user:pass@host:5432/db` | Ambiente que já fornece URL pronta |
| 2 | Só host (sem `://`) | `sigac-dsv.petrobras.com.br` | Proxy/DNS corporativo acessível via VPN |
| 3 | Vazio | `""` | Monta a partir de `RDS_AURORA_POSTGRES_HOST` + credenciais |

Quando host, usuário, senha e banco separados estiverem todos preenchidos, eles
têm prioridade sobre as URLs PostgreSQL e endpoints legados, inclusive os vindos
de `.env`. Uma URL explícita de SQLite continua selecionando o modo local.
Para usar uma URL PostgreSQL pronta ou um proxy diferente, não configure o conjunto
completo de variáveis separadas ao mesmo tempo.

Na AWS, basta injetar como variáveis de ambiente as chaves
`rds_aurora_postgres_host`, `rds_aurora_postgres_username`,
`rds_aurora_postgres_password` e `rds_aurora_postgres_dbname`, além de `db_schema`.
Maiúsculas e minúsculas são aceitas. Host deve conter somente o hostname e banco
somente o nome do banco; a porta usada nesse formato é 5432.
Para outra porta, defina `RDS_AURORA_POSTGRES_PORT` (aliases: `POSTGRES_PORT`,
`PGPORT`). No formato host-only, `host:porta/banco` preserva a porta e o banco
informados; valores ausentes usam a porta configurada e o banco separado.
O deploy precisa mapear as chaves do Secrets Manager/Parameter Store para o
ambiente do container: a aplicação não busca esses serviços diretamente.
Recrie as tarefas/pods após atualizar os secrets.

Os aliases de banco `RDS_AURORA_POSTGRES_DATABASE` e `RDS_AURORA_POSTGRES_DB`
têm prioridade sobre `RDS_AURORA_POSTGRES_DBNAME`; evite defini-los simultaneamente.
Quando uma URL é ignorada em favor do conjunto completo, o log registra
`database_configuration source=separate_variables url_override_ignored=true`,
sem imprimir credenciais ou a URL.

O runtime usa `create_async_engine` e `asyncpg`, declarado nas dependências
instaladas pelo Dockerfile. URLs `postgres://`, `postgresql://` e
`postgresql+psycopg://` são adaptadas para `postgresql+asyncpg://` ao criar o
engine; não é necessário instalar ou trocar para psycopg.

`DB_SCHEMA` define `search_path` pelo parâmetro `server_settings` do asyncpg.
Os parâmetros legados `options`, `sslmode` e `channel_binding` da URL são
removidos: TLS é controlado por `DB_SSL_VERIFY` e `DB_SSL_CA_FILE`, não por
essas opções nem pelas variáveis `CA_*` do CAV4. TLS permanece ativo quando
`DB_SSL_VERIFY=false`; apenas a validação do certificado é desligada.
Para validar certificados, use `DB_SSL_VERIFY=true` e a CA apropriada.

`DB_COMMAND_TIMEOUT` deve ser positivo e limita, em segundos, a espera pelo
pool, a abertura da conexão, as consultas e o probe de diagnóstico.
`/api/health/database/config` executa `SELECT 1` e retorna `database=connected`
ou HTTP 503 com `database=unavailable` e `error_id`. Esse probe não comprova
acesso às tabelas nem permissões de escrita usadas pelo login.

### SQLite local (apenas desenvolvimento)

```dotenv
DATABASE_URL=sqlite:///./local.db
# equivalente: RDS_AURORA_POSTGRES_URL=sqlite+aiosqlite:///./local.db
```

O `app/core/config.py` troca o engine pelo prefixo da URL e normaliza `sqlite:///` para o driver assíncrono `aiosqlite`. Nesse modo `DB_SCHEMA` é ignorado.

> ⚠️ **Limite atual:** a conexão e os testes funcionam em SQLite, mas a API completa ainda não roda nele, porque parte das consultas (`auth`, `platform` e o callback CAV4) usa SQL específico de PostgreSQL e a migration `0001` usa tipos PostgreSQL.
>
> **Nunca use SQLite em homologação ou produção.**

---

## Execução

```bash
# Aplicar migrations
alembic upgrade head

# Iniciar servidor de desenvolvimento
uvicorn app.main:app --reload --port 8080
```

### Primeira carga de um banco novo (seed)

Quando o banco é novo ou foi recriado, o `alembic upgrade head` cria as tabelas, mas as de catálogo ficam vazias (a migration `0001` não carrega dados). O `app/db/seed.py` faz essa primeira carga com os dados que **não são do domínio do projeto** e que existem no DSV: perfis, módulos, permissões, menus, cards do dashboard, status, áreas e relatórios.

```bash
alembic upgrade head

python -m app.db.seed                    # DSV: referência + usuários de teste
python -m app.db.seed --sample-projects  # DSV: inclui 4 projetos fictícios
python -m app.db.seed --confirm          # staging e produção: somente referência
```

| `ENVIRONMENT` | O que carrega | Exige |
|---------------|---------------|-------|
| `development`, `test` | Referência e os usuários de teste; projetos fictícios com `--sample-projects` | — |
| `staging`, `production` | **Somente** referência (sem usuários e sem projetos) | `--confirm` |
| qualquer outro | Nada: o comando recusa | — |

- Só insere o que falta: nunca altera nem apaga um registro existente, então pode ser repetido sem risco.
- Em um banco que já tem os dados (como o DSV atual) ele não insere nada.
- Os dados são uma cópia do DSV de uma data; se os catálogos mudarem lá, atualize o arquivo.

### Endpoints principais

| Rota | Descrição |
|------|-----------|
| `/health`, `/health/live` | Disponibilidade da API (não consulta o banco) |
| `/health/ready`, `/health/database` | Disponibilidade com consulta ao banco e à revisão do Alembic |
| `/api/health*` | Mesmas rotas de health sob `/api` (usadas pelo deploy) |
| `/docs`, `/redoc` | OpenAPI/Swagger e ReDoc (quando `EXPOSE_API_DOCS=true`) |
| `/api/auth/session`, `/api/auth/logout` | Sessão atual e logout |
| `/api/auth/cav4/start`, `/callback`, `/session`, `/logout` | Login corporativo CAV4 (OIDC) |
| `/api/projects`, `/api/projects/{id}` | CRUD de projetos |
| `/api/projects/areas`, `/{id}/members` | Áreas responsáveis e membros |
| `/api/folders?projectId=` | Pastas/arquivos por projeto (leitura) |
| `/api/reports`, `/api/reports/export`, `/api/report-fields` | Relatórios, exportação e campos configuráveis |
| `/api/audit/events`, `/api/audit/logs` | Registro e consulta de auditoria |
| `/api/activity-logs` | Logs de atividade (visão da plataforma) |
| `/api/platform/context` | Contexto da plataforma (menus, permissões) |
| `/api/catalogos` | Catálogos de dados |
| `/api/configurations/{resource}` | Manutenção das tabelas de configuração |
| `/api/dashboard/summary` | Indicadores do dashboard |
| `/api/users` | Lista de usuários |
| `/api/access-map`, `/api/access-map/export` | Mapa de acesso e exportação |

> O login por e-mail (`EMAIL_LOGIN_ENABLED`) está previsto na configuração e no schema `EmailLoginRequest`, mas o backend ainda não expõe a rota `POST /api/auth/login`.

---

## Testes e validação

```bash
# Todos os testes (os de integração são pulados sem banco acessível)
pytest -q

# Verificar sincronia modelos ↔ migrations (exige banco acessível)
alembic check

# Lint
ruff check app alembic scripts tests

# Compilar (sintaxe)
python -m compileall app
```

### Antes de publicar (PR)

- [ ] `pytest -q` passa
- [ ] `alembic check` passa (sem drift)
- [ ] `ruff check` passa
- [ ] Novas variáveis adicionadas ao `.env.example`
- [ ] Nenhum segredo/credencial commitado

---

## Migrations com Alembic

O Alembic é a **única** fonte de criação e alteração do schema. A API nunca cria tabelas no startup e `Base.metadata.create_all()` não deve ser usado.

### Regras

- Revisão já aplicada em qualquer ambiente **nunca é editada**: a mudança vira uma nova revisão.
- Uma revisão por mudança lógica, com mensagem descritiva (`-m "add sessions table"`).
- Sempre revise o script gerado pelo `--autogenerate`: renomeações aparecem como `drop` + `create`, e índices, constraints e `server_default` podem faltar.
- Toda revisão implementa `upgrade()` e `downgrade()`.
- A cadeia é linear, com um único `head` (o teste `tests/test_migrations.py` valida isso).
- Novas revisões são nomeadas `AAAAMMDD_<id>_<descricao>.py` (`file_template` do `alembic.ini`). A baseline `0001_production_baseline` mantém o nome original.

### Fluxo de uma nova migration

```bash
# 1. Altere o model e registre-o em app/db/models.py
# 2. Gere a revisão contra um banco de desenvolvimento descartável
alembic revision --autogenerate -m "descricao da mudanca"
# 3. Revise e ajuste o arquivo gerado em alembic/versions/
# 4. Teste o ciclo completo
alembic upgrade head
alembic downgrade -1
alembic upgrade head
# 5. Confirme que não há diferença entre models e migrations
alembic check
# 6. Commite a revisão junto com a mudança do model
```

Para ler o SQL sem executar: `alembic upgrade <de>:<para> --sql`.

### Comandos úteis

```bash
alembic current     # revisão aplicada no banco
alembic heads       # head do código (deve haver apenas um)
alembic history     # histórico de revisões
```

---

## Docker

```bash
# Build e execução
docker compose up --build

# Segundo plano
docker compose up --build -d

# Logs
docker compose logs -f back-end

# Parar
docker compose down
```

### Publicação no JFrog Artifactory

Configure no `.env`:

```dotenv
JFROG_REGISTRY=jfrog.petrobras.dev.br
JFROG_DOCKER_REPOSITORY=informar-repositorio-docker
IMAGE_TAG=local
JFROG_USER=seu-usuario
JFROG_TOKEN=seu-token
```

```bash
docker login "$JFROG_REGISTRY" --username "$JFROG_USER" --password-stdin <<< "$JFROG_TOKEN"
docker compose build
docker compose push
```

---

## Integração com o Frontend

O frontend (Next.js em `../frontend/`) fala com o backend assim:

| Ambiente | Como a URL do backend é resolvida |
|----------|-----------------------------------|
| Desenvolvimento | O Next reescreve `/api/*` para `BACKEND_INTERNAL_URL` (padrão `http://localhost:8080`); `NEXT_PUBLIC_API_BASE_URL` não é necessária |
| Produção | `NEXT_PUBLIC_API_BASE_URL` é obrigatória no navegador; `BACKEND_INTERNAL_URL` é usada pelo servidor do Next para validar a sessão |

```dotenv
NEXT_PUBLIC_API_BASE_URL=https://<dominio-do-sigac>
BACKEND_INTERNAL_URL=http://localhost:8080
```

A API deve permitir a origem do frontend em `CORS_ORIGINS`. Em produção, use URLs explícitas — **nunca** use `*` com autenticação ou cookies de sessão.

---

## Documentação adicional

| Documento | Conteúdo |
|-----------|----------|
| [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) | Arquitetura completa: camadas, diretórios, fluxos, regras, checklist de PR |
| [`.env.example`](.env.example) | Todas as variáveis de ambiente documentadas |
| [`alembic/versions/`](alembic/versions/) | Histórico completo de migrations |
