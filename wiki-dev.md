# Wiki Dev — SIGAC

> Documentação técnica consolidada do **Sistema de Gestão de Acesso ao Armazenamento Científico (SIGAC)**.
>
> A aplicação é dividida em duas partes independentes: a aplicação web na raiz, em Next.js, e [`back-end/`](back-end/), em FastAPI.

## Índice

- [1. Visão geral](#1-visão-geral)
- [2. Como executar](#2-como-executar)
- [3. SQLite e PostgreSQL](#3-sqlite-e-postgresql-passo-a-passo)
- [4. Estrutura do frontend](#4-estrutura-do-frontend)
- [5. Estrutura do backend](#5-estrutura-do-backend)
- [6. Banco de dados](#6-banco-de-dados)
- [7. Tabelas e campos](#7-tabelas-e-campos)
- [8. Modelagem e diagrama](#8-modelagem-e-diagrama)
- [9. API e endpoints](#9-api-e-endpoints)
- [10. Mapa API x frontend](#10-mapa-api-x-frontend)
- [11. Autenticação e permissões](#11-autenticação-e-permissões)
- [12. Padrões de desenvolvimento](#12-padrões-de-desenvolvimento)
- [13. Testes e resultados](#13-testes-e-resultados)
- [14. Branches, commits e PRs](#14-branches-commits-e-prs)
- [15. Troubleshooting](#15-troubleshooting)
- [16. Deploy](#16-deploy)
- [17. Integração corporativa CAV4 e Entra ID](#17-integração-corporativa-cav4-e-entra-id)
- [18. Referências do repositório](#18-referências-do-repositório)

---

## 1. Visão geral

O SIGAC controla o acesso a projetos, arquivos científicos, membros, compartilhamentos e registros de auditoria.

### Responsabilidade de cada camada

- **Frontend:** telas, navegação, formulários, estados de carregamento, mensagens e interação com o usuário.
- **Backend:** API HTTP, validação, autenticação, autorização, regras de negócio, auditoria e acesso ao banco.
- **Banco:** persistência de usuários, perfis, projetos, arquivos, vínculos e logs.

O frontend nunca deve ser a única barreira de segurança. Toda permissão precisa ser conferida no backend.

### Stack, arquitetura e padrões adotados

#### Front-end

- **Next.js 16.2.6**, com **App Router**, usando **React 19.2.4**, **TypeScript 5** e **Tailwind CSS 4**.
- Arquitetura baseada no **App Router**, com Server Components por padrão e Client Components somente quando são necessários estado, eventos ou APIs do navegador.
- Organização por componentes e responsabilidades: páginas e layouts compõem as telas, componentes reutilizáveis concentram a apresentação e `lib/`/hooks centralizam integração, estado e utilitários.
- Padrões principais: **Component-based Architecture**, **Server/Client Components**, **Container/Presentation**, **Service/API Layer**, **Design System** e **Responsive Mobile-first**.
- O acesso à API é centralizado em `lib/api-client.ts`; componentes visuais não devem implementar regras definitivas de autorização.

#### Back-end

- **Python 3.11 ou superior**, com **FastAPI**, **SQLAlchemy 2.0**, **Pydantic 2**, **Alembic** e suporte a SQLite/PostgreSQL.
- Arquitetura **modular por domínio**, em evolução para **Clean Architecture** e **Hexagonal Architecture (Ports and Adapters)**.
- A camada HTTP recebe requisições, os application services orquestram casos de uso, repositories encapsulam a persistência e adapters isolam bancos e integrações externas.
- Padrões principais: **Layered Architecture**, **Service Layer**, **Repository Pattern**, **Dependency Injection**, **Schema/DTO Pattern** e **Adapter de compatibilidade** para a API legada.
- As rotas não devem acessar o banco diretamente; alterações estruturais devem ser feitas por migrations versionadas do Alembic.

A separação entre as camadas mantém a interface independente das regras de negócio e permite evoluir o banco ou integrações sem acoplar todo o sistema. O back-end permanece como fonte definitiva para autenticação, autorização, validação e auditoria.

### Fluxo de uma operação

1. O usuário acessa uma página em [`app/`](app/).
2. Um hook em [`hooks/`](hooks/) ou o cliente [`lib/api-client.ts`](lib/api-client.ts) envia uma requisição HTTP.
3. Um controller em [`back-end/app/modules/`](back-end/app/modules/) valida a requisição.
4. O backend consulta os models e aplica as regras de acesso.
5. A API retorna JSON.
6. O frontend atualiza loading, sucesso, erro ou estado vazio.

---

## 2. Como executar

Frontend e backend usam instalações independentes. No frontend, use `npm ci` com o lockfile sincronizado. No backend, use `uv sync --dev`.

### Validação completa

```bash
npm ci
npm run lint
npm run typecheck
npm run build

cd ../back-end
uv sync --dev
uv run ruff check app alembic scripts tests
uv run pytest -q
uv run alembic check
```


Frontend e backend são aplicações independentes e devem ser iniciados em terminais separados.

### Pré-requisitos

- Python 3.11 ou superior;
- Node.js 20 ou superior;
- pnpm;
- SQLite 3 para desenvolvimento;
- PostgreSQL para ambientes compartilhados ou produção.

### Iniciar o backend

```bash
cd back-end
uv sync --dev
cp .env.example .env
uv run alembic upgrade head
uv run uvicorn app.app:app --host 0.0.0.0 --port 8080 --reload
```

No Windows, se não usar `uv`, prefira Python 3.11–3.13. Python 3.14 pode travar no `ensurepip` durante `venv`:

```powershell
cd back-end
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

### Iniciar o frontend

Em outro terminal:

```bash
pnpm install
```

Crie `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

Depois execute:

```bash
pnpm build
pnpm dev
```

### URLs importantes

| Recurso | URL |
|---|---|
| Aplicação | [http://localhost:3000](http://localhost:3000) |
| Login | [http://localhost:3000/login](http://localhost:3000/login) |
| Wiki Dev | Este arquivo `wiki-dev.md` |
| Swagger | [http://localhost:8080/docs](http://localhost:8080/docs) |
| ReDoc | [http://localhost:8080/redoc](http://localhost:8080/redoc) |
| OpenAPI JSON | [http://localhost:8080/openapi.json](http://localhost:8080/openapi.json) |
| Health check | [http://localhost:8080/health](http://localhost:8080/health) |

---

## 3. SQLite e PostgreSQL passo a passo

O backend suporta dois bancos selecionáveis pelo `.env`: SQLite para desenvolvimento local e PostgreSQL para ambientes compartilhados ou produção. O mesmo contrato de API deve funcionar nos dois modos; altere apenas `DATABASE_ENGINE` e `DATABASE_URL`.

### SQLite local

O SQLite usa o arquivo `back-end/data/sigac.db` e é indicado para desenvolvimento individual.

### Configuração pelo `.env`

#### SQLite local

```env
DATABASE_ENGINE=sqlite
DATABASE_URL=sqlite+aiosqlite:///./data/sigac.db
SEED_DATABASE=true
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
COOKIE_SECURE=false
ENVIRONMENT=development
```

#### PostgreSQL

```env
DATABASE_ENGINE=postgresql
DATABASE_URL=postgresql://usuario:senha@host/postgresqldb?sslmode=require
SEED_DATABASE=false
CORS_ORIGINS=https://seu-frontend.example.com
COOKIE_SECURE=true
ENVIRONMENT=production
```

O valor de `DATABASE_ENGINE` decide o driver usado pela API. Nunca versionar credenciais reais; use as variáveis de ambiente do projeto ou o arquivo `.env` local não versionado. O arquivo [`ACESSO_BANCO_POSTGRESQL.txt`](ACESSO_BANCO_POSTGRESQL.txt) contém o guia de configuração sem expor senhas ou tokens.

O caminho `./data/sigac.db` é relativo ao diretório em que a API é iniciada. Execute o Uvicorn dentro de `back-end/` para gerar:

```text
back-end/data/sigac.db
```

### Criar e atualizar tabelas

```bash
cd back-end
alembic upgrade head
alembic current
alembic history
```

A migration [`0002_remove_app_prefix.py`](back-end/alembic/versions/0002_remove_app_prefix.py) renomeia bancos antigos que ainda possuam o prefixo `app_`, preservando os registros.

### Seed e login local

Na primeira execução, o seed cria perfis e usuários iniciais apenas quando eles ainda não existem. O login local exige que o e-mail esteja na tabela [`users`](#users).

### Visualizar dados

- Use o [Swagger](http://localhost:8080/docs) para consultar a API;
- Use o **DB Browser for SQLite** para abrir `back-end/data/sigac.db`;
- Não coloque o `.db` dentro de `public/`;
- Não crie uma rota HTTP que entregue o arquivo SQLite diretamente.

### Resetar o banco local

> Esta operação apaga os dados locais.

```bash
rm back-end/data/sigac.db
cd back-end
alembic upgrade head
```

---

## 4. Estrutura do frontend

A aplicação web está na raiz do repositório e é uma instalação Next.js independente. O diretório `back-end/` permanece separado como serviço FastAPI.

| Pasta/arquivo | Finalidade |
|---|---|
| [`app/`](app/) | Rotas, layouts, páginas e grupos de rotas do App Router. |
| [`app/(app)/`](app/(app)/) | Área autenticada da aplicação. |
| [`app/login/`](app/login/) | Página e fluxo visual de login. |
| [`wiki-dev.md`](wiki-dev.md) | Documentação técnica consolidada; não há página Wiki Dev no frontend. |
| [`components/`](components/) | Componentes reutilizáveis de UI e domínio. |
| [`components/ui/`](components/ui/) | Componentes base do shadcn/ui. |
| [`hooks/`](hooks/) | Hooks para sessão, usuários, projetos, arquivos e permissões. |
| [`lib/`](lib/) | Cliente HTTP, tipos, estado, navegação e utilitários. |
| [`lib/api-client.ts`](lib/api-client.ts) | Centraliza chamadas para a API. |
| [`public/`](public/) | Imagens, fontes e arquivos estáticos. |
| [`tests/`](tests/) | Testes E2E e verificações do frontend. |
| [`package.json`](package.json) | Scripts e dependências JavaScript. |
| [`tsconfig.json`](tsconfig.json) | Configuração do TypeScript e aliases. |
| [`next.config.ts`](next.config.ts) | Configuração do Next.js. |
| [`components.json`](components.json) | Configuração do shadcn/ui. |
| [`.env.local`](.env.local) | Variáveis locais não versionadas. |

### Comandos

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm build
pnpm test:e2e
```

---

## 5. Estrutura do backend

O backend está em [`back-end/`](back-end/) e usa FastAPI, SQLAlchemy 2.0, Pydantic e Alembic. A arquitetura adotada é modular por domínio, com evolução para Clean Architecture e Hexagonal Architecture (Ports and Adapters). Controllers cuidam do HTTP, application services orquestram casos de uso, repositories encapsulam persistência e adapters isolam PostgreSQL/SQLite e integrações externas. A compatibilidade legada está isolada em [`back-end/app/api/legacy.py`](back-end/app/api/legacy.py) e não deve receber novos domínios.

| Pasta/arquivo | Finalidade |
|---|---|
| [`back-end/app/`](back-end/app/) | Pacote principal da aplicação Python. |
| [`back-end/app/main.py`](back-end/app/main.py) | Entry point ASGI usado pelo Uvicorn. |
| [`back-end/app/app.py`](back-end/app/app.py) | Monta a aplicação, middlewares, CORS e routers. |
| [`back-end/app/core/`](back-end/app/core/) | Configuração, ambiente, segurança e utilitários centrais. |
| [`back-end/app/core/config.py`](back-end/app/core/config.py) | Lê variáveis de ambiente e configura o sistema. |
| [`back-end/app/api/`](back-end/app/api/) | Dependências compartilhadas, sessão e autenticação das rotas. |
| [`back-end/app/db/`](back-end/app/db/) | Engine, sessão, Base SQLAlchemy e seed. |
| [`back-end/app/modules/`](back-end/app/modules/) | Domínios funcionais separados. |
| [`back-end/app/modules/users/`](back-end/app/modules/users/) | Usuários, perfis, login e permissões. |
| [`back-end/app/modules/projects/`](back-end/app/modules/projects/) | Projetos e membros. |
| [`back-end/app/modules/files/`](back-end/app/modules/files/) | Arquivos e compartilhamentos. |
| [`back-end/app/modules/audit/`](back-end/app/modules/audit/) | Logs de atividade e auditoria. |
| `module.py` | Registra o módulo e seus routers. |
| `models.py` | Define tabelas SQLAlchemy e relacionamentos. |
| `schemas.py` | Define entrada e saída com Pydantic. |
| `controller.py` | Define endpoints HTTP e respostas. |
| `service.py`/`repository.py` | Regras de negócio e acesso a dados, quando presentes. |
| [`back-end/alembic/`](back-end/alembic/) | Histórico de migrations do banco. |
| [`back-end/alembic/env.py`](back-end/alembic/env.py) | Conecta Alembic à configuração e metadata. |
| [`back-end/alembic/versions/`](back-end/alembic/versions/) | Migrations incrementais. |
| [`back-end/data/`](back-end/data/) | Arquivo SQLite local; não é armazenamento de produção. |
| [`back-end/tests/`](back-end/tests/) | Testes de contrato, schemas e integração. |
| [`back-end/requirements.txt`](back-end/requirements.txt) | Dependências Python. |
| [`back-end/.env.example`](back-end/.env.example) | Modelo de configuração local. |
| [`README.md`](README.md) | Documentação operacional única do frontend e backend. |

### Comandos de qualidade

```bash
cd back-end
python -m compileall -q app alembic
python -m pip check
python -m pytest -q
ruff check .
```

---

## 6. Banco de dados

### Ciclo de mudança

1. Alterar o model SQLAlchemy;
2. Criar uma migration Alembic incremental;
3. Revisar o SQL e comparar com o PosgreSql;
4. Fazer backup antes de alterar dados;
5. Aplicar a migration em ambiente controlado;
6. Validar tabelas, campos, PKs, FKs e contagens;
7. Atualizar `docs/database-structure.md` e esta wiki.

Não altere uma migration já aplicada e não remova tabelas legadas sem confirmar o impacto na API.

---

## 7. Tabelas, campos, PKs e FKs

Os campos estão agrupados por tabela e representam exatamente os nomes usados no banco; `*` identifica a chave primária. As FKs são listadas separadamente para evitar inferências baseadas apenas em nomes parecidos.

### Schema `postgre_auth`

| Tabela | Campos físicos | PK | FKs |
|---|---|---|---|
| `user` | `id*`, `name`, `email`, `emailVerified`, `image`, `createdAt`, `updatedAt`, `role`, `banned`, `banReason`, `banExpires` | `id` | — |
| `account` | `id*`, `accountId`, `providerId`, `userId`, `accessToken`, `refreshToken`, `idToken`, `accessTokenExpiresAt`, `refreshTokenExpiresAt`, `scope`, `password`, `createdAt`, `updatedAt` | `id` | `userId -> user.id` |
| `session` | `id*`, `expiresAt`, `token`, `createdAt`, `updatedAt`, `ipAddress`, `userAgent`, `userId`, `impersonatedBy`, `activeOrganizationId` | `id` | `userId -> user.id` |
| `verification` | `id*`, `identifier`, `value`, `expiresAt`, `createdAt`, `updatedAt` | `id` | — |
| `organization` | `id*`, `name`, `slug`, `logo`, `createdAt`, `metadata` | `id` | — |
| `member` | `id*`, `organizationId`, `userId`, `role`, `createdAt` | `id` | `organizationId -> organization.id`; `userId -> user.id` |
| `invitation` | `id*`, `organizationId`, `email`, `role`, `status`, `expiresAt`, `createdAt`, `inviterId` | `id` | `organizationId -> organization.id`; `inviterId -> user.id` |
| `jwks` | `id*`, `publicKey`, `privateKey`, `createdAt`, `expiresAt` | `id` | — |
| `project_config` | `id*`, `name`, `endpoint_id`, `created_at`, `updated_at`, `trusted_origins`, `social_providers`, `email_provider`, `email_and_password`, `allow_localhost`, `plugin_configs`, `webhook_config` | `id` | — |

### Schema `public`: tabelas canônicas

| Tabela | Campos físicos | PK | FKs declaradas |
|---|---|---|---|
| `profiles` | `id*`, `name`, `description`, `created_at` | `id` | — |
| `modules` | `id*`, `name`, `route`, `icon`, `display_order`, `active` | `id` | — |
| `permissions` | `id*`, `module_id`, `name`, `description`, `active` | `id` | `module_id -> modules.id` |
| `profile_modules` | `profile_id*`, `module_id*`, `can_view` | `(profile_id,module_id)` | `profile_id -> profiles.id`; `module_id -> modules.id` |
| `profile_permissions` | `profile_id*`, `permission_id*`, `allowed` | `(profile_id,permission_id)` | `profile_id -> profiles.id`; `permission_id -> permissions.id` |
| `project_statuses` | `id*`, `code`, `nome`, `color`, `display_order`, `active`, `allows_edit` | `id` | — |
| `project_types` | `id*`, `code`, `nome`, `description`, `active` | `id` | — |
| `projects` | `id`, `name`, `code`, `responsible_area`, `managers_ids`, `write_group`, `read_group`, `write_identity_role`, `read_identity_role`, `snow_task_number`, `parent_folder`, `description`, `status`, `participants_ids`, `created_at`, `updated_at` | sem PK declarada no inventário atual | — |
| `project_members` | `project_id`, `user_id`, `papel`, `created_at` | sem PK declarada | — |
| `files` | `id`, `project_id`, `parent_id`, `kind`, `name`, `size_bytes`, `mime_type`, `created_by`, `created_at`, `updated_at` | sem PK declarada | — |
| `file_shares` | `file_id`, `user_id`, `level` | sem PK declarada | — |
| `file_permissions` | `file_id`, `user_id`, `group_id`, `level`, `inherited_from`, `created_at` | sem PK declarada | — |
| `access_requests` | `id`, `project_id`, `requester_id`, `status`, `created_at` | sem PK declarada | — |
| `activity_logs` | `id`, `user_id`, `action`, `entity`, `entity_id`, `details`, `created_at` | sem PK declarada | — |
| `menus` | `id`, `modulo_id`, `parent_id`, `nome`, `rota`, `icone`, `ordem`, `ativo` | sem PK declarada | — |
| `report_types` | `id*`, `code`, `name`, `description`, `formats`, `active` | `id` | — |
| `report_fields` | `id*`, `report_code`, `field_key`, `label`, `source_key`, `display_order`, `active` | `id` | sem FK declarada; `report_code` é referência lógica |
| `responsible_areas` | `id*`, `name`, `prefix`, `next_number`, `active`, `created_at`, `updated_at` | `id` | — |
| `system_settings` | `key*`, `value`, `value_type`, `description`, `group_name`, `active` | `key` | — |

### Schema `public`: tabelas legadas/compatibilidade

| Tabela | Campos físicos |
|---|---|
| `perfis` | `id`, `nome`, `descricao`, `criado_em` |
| `modulos` | `id`, `nome`, `rota`, `icone`, `ordem`, `ativo` |
| `permissoes` | `id`, `modulo_id`, `nome`, `descricao`, `ativo` |
| `perfil_modulos` | `perfil_id`, `modulo_id`, `pode_visualizar` |
| `perfil_permissoes` | `perfil_id`, `permissao_id`, `permitido` |
| `status_projetos` | `id`, `codigo`, `nome`, `cor`, `ordem`, `ativo`, `permite_edicao` |
| `tipos_projetos` | `id`, `codigo`, `nome`, `descricao`, `ativo` |
| `tipos_relatorios` | `id`, `codigo`, `nome`, `descricao`, `formatos`, `ativo` |
| `users` | `id`, `name`, `email`, `cargo`, `area`, `role`, `perfil_id`, `created_at`, `avatar_url`, `last_login_at`, `job_title`, `profile_id` |
| `sessions` | `id`, `user_id`, `expires_at` |
| `settings` | `key`, `value` |
| `configuracoes_sistema` | `chave`, `valor`, `tipo`, `descricao`, `grupo`, `ativo` |
| `permission_matrix` | `id`, `matrix` |

As tabelas legadas não devem ser removidas automaticamente: ainda podem ser consultadas pela camada de compatibilidade. A existência de colunas com nomes equivalentes não cria uma FK; somente as restrições declaradas pelo PostgreSQL são relacionamentos oficiais.

### Restrições UNIQUE relevantes

`postgre_auth.user.email`, `postgre_auth.session.token`, `postgre_auth.organization.slug`, `postgre_auth.project_config.endpoint_id`, `public.profiles.name`, `public.modules.name`, `public.project_statuses.code`, `public.project_types.code`, `public.report_types.code` e `public.responsible_areas.prefix` possuem unicidade declarada.

---

## 8. Modelagem e diagrama

O estado físico atual possui **41 tabelas e 11 FKs**. O diagrama abaixo mostra somente relacionamentos declarados no banco; tabelas `public` como `projects`, `users`, `files` e `project_members` possuem nomes de colunas que sugerem vínculos, mas não têm FK declarada no PosgreSql e, por isso, aparecem sem ligação oficial.

```mermaid
erDiagram
  USER ||--o{ ACCOUNT : possui
  USER ||--o{ SESSION : inicia
  USER ||--o{ MEMBER : participa
  USER ||--o{ INVITATION : envia
  ORGANIZATION ||--o{ MEMBER : possui
  ORGANIZATION ||--o{ INVITATION : recebe
  MODULES ||--o{ PERMISSIONS : define
  PROFILES ||--o{ PROFILE_MODULES : acessa
  MODULES ||--o{ PROFILE_MODULES : habilita
  PROFILES ||--o{ PROFILE_PERMISSIONS : recebe
  PERMISSIONS ||--o{ PROFILE_PERMISSIONS : concede
```

### Tabelas sem FK declarada

No schema `public`, as tabelas de domínio e compatibilidade (`projects`, `project_members`, `files`, `file_shares`, `file_permissions`, `access_requests`, `activity_logs`, `menus`, `perfis`, `modulos`, `permissoes`, `users`, `sessions`, `settings`, `configuracoes_sistema`, `permission_matrix`, `project_statuses`, `project_types`, `report_types`, `report_fields`, `responsible_areas`, `system_settings`, `status_projetos`, `tipos_projetos` e `tipos_relatorios`) não possuem FK declarada no inventário atual.

### Fonte e validação

- Inventário live: `information_schema.columns`, `information_schema.table_constraints` e `information_schema.key_column_usage`;
- Documento detalhado: [`docs/database-structure.md`](docs/database-structure.md);
- Schema SQLite: [`back-end/database/sqlite-schema.sql`](back-end/database/sqlite-schema.sql);
- Models: [`back-end/app/modules/*/models.py`](back-end/app/modules/);
- Migrations: [`back-end/alembic/versions/`](back-end/alembic/versions/).

---

## 9. API e endpoints

### Relatórios e exportação

O relatório de projetos usa os dados persistidos de `projects`, `files`, `project_members` e os campos ativos de `report_fields`. A consulta JSON está em `GET /api/reports`; as exportações estão em `GET /api/reports/export` com `format=csv|txt|pdf`, filtros `status`, `area`, `gestorId` e `fields`. Os rótulos e campos são carregados do catálogo `report_fields`; o PDF retorna `application/pdf` com `Content-Disposition` próprio.

A tela de relatórios carrega os status ativos de `GET /api/catalogos`, sem lista fixa de status para o filtro. O backend reaplica a autorização e os filtros antes de gerar CSV, TXT ou PDF.

### Estado da API

Os endpoints em `back-end/app/modules/` são a arquitetura modular preferencial. A `legacy_api.py` ainda fornece compatibilidade para autenticação, relatórios, configurações, permissões, solicitações de acesso, exportações e alguns CRUDs. Rotas duplicadas de projetos, arquivos, usuários e membros devem ser migradas gradualmente para os controllers modulares antes da remoção da camada legada.

### Rotas removidas

A página `/wiki-dev` foi removida intencionalmente. A documentação oficial é somente este arquivo `wiki-dev.md`.

## 9.1. API e endpoints

A fonte viva do contrato é o [Swagger](http://localhost:8080/docs) e o arquivo [`OpenAPI JSON`](http://localhost:8080/openapi.json).

| Grupo | Endpoints | Finalidade |
|---|---|---|
| Saúde | `GET /health`, `GET /health/live`, `GET /health/ready`, `GET /health/database` | Liveness, readiness e conexão com o banco. |
| Login | `POST /api/auth/login` | Inicia sessão por e-mail. |
| Sessão | `GET /api/auth/session` | Retorna o usuário atual. |
| Logout | `POST /api/auth/logout` | Encerra sessão. |
| Diretório | `GET /api/users` | Consulta autenticada para seleção de participantes e membros. |
| Perfis | `GET /api/perfis` | Catálogo de perfis e autorização. |
| Permissões | `GET /api/permissions` | Consulta permissões disponíveis. |
| Projetos | `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/{id}` | CRUD de projetos. |
| Membros | `GET/POST /api/projects/{id}/members`, `DELETE /api/projects/{id}/members/{user_id}` | Participantes. |
| Arquivos | `GET/POST /api/files`, `GET/PATCH/DELETE /api/files/{id}` | Metadados de arquivos. |
| Compartilhamentos | `GET/POST /api/files/{id}/shares`, `DELETE /api/files/{id}/shares/{user_id}` | Acessos a arquivos. |
| Auditoria | `GET /api/activity-logs` | Eventos do sistema. |
| Relatórios | `GET /api/reports/summary`, `GET /api/reports/projects` | Dados agregados. |

### Códigos HTTP

- `200`/`201`: sucesso;
- `400`: payload ou regra inválida;
- `401`: sessão ausente ou expirada;
- `403`: permissão insuficiente;
- `404`: recurso inexistente;
- `409`: conflito;
- `422`: validação Pydantic;
- `500`: erro inesperado.

---

## 10. Mapa API x frontend

| Domínio | API | Arquivos frontend |
|---|---|---|
| Cliente HTTP | Todos os endpoints | [`lib/api-client.ts`](lib/api-client.ts) |
| Sessão | `/api/auth/session` | [`hooks/use-session.ts`](hooks/use-session.ts), [`app/login/page.tsx`](app/login/page.tsx) |
| Diretório | `/api/users` | [`hooks/use-users.ts`](hooks/use-users.ts), seleção de membros de projetos |
| Permissões | `/api/permissions` | [`hooks/use-permissions.ts`](hooks/use-permissions.ts) |
| Projetos | `/api/projects` | [`hooks/use-projects.ts`](hooks/use-projects.ts), [`hooks/use-project.ts`](hooks/use-project.ts), páginas de projetos |
| Membros | `/api/projects/{id}/members` | [`hooks/use-project-members.ts`](hooks/use-project-members.ts) |
| Arquivos | `/api/files` | [`hooks/use-files.ts`](hooks/use-files.ts) |
| Auditoria | `/api/activity-logs` | [`hooks/use-activity-logs.ts`](hooks/use-activity-logs.ts), tabela de logs |
| Relatórios | `/api/reports/*` | [`app/(app)/relatorios/`](app/(app)/relatorios/) |

### Arquitetura e qualidade do backend

As rotas novas são organizadas por módulos em `back-end/app/modules/` (projetos, arquivos e auditoria), enquanto `legacy_api.py` permanece como camada de compatibilidade durante a migração gradual. O boundary oficial dessa compatibilidade é `back-end/app/api/legacy.py`; novos endpoints devem seguir controller → service → repository → banco ou port → adapter. O acesso ao banco é centralizado em `app/db/session.py`, com suporte a SQLite local e PostgreSQL em produção.

As entradas são validadas por schemas Pydantic com limites para códigos, nomes, MIME type e tamanho de arquivos. A configuração de produção rejeita SQLite, cookies inseguros, documentação OpenAPI exposta e CORS wildcard. Os health checks são separados em `/health/live`, `/health/ready` e `/health/database`, mantendo `/health` como alias compatível.

A suíte `back-end/tests/` cobre contrato OpenAPI, autorização, schemas, rotas e integração PostgreSQL. Execute `uv run pytest -q` no diretório `backend` antes de publicar alterações.

### Como rastrear uma chamada

1. Comece pelo hook;
2. Localize a função usada em `lib/api-client.ts`;
3. Procure o path no controller Python;
4. Identifique o schema e model consultados;
5. Confira as regras de sessão e autorização;
6. Atualize esta tabela quando criar uma nova integração.

---

## 11. Autenticação e permissões

### Proteção de rotas e páginas de erro

As rotas privadas do frontend são protegidas por `middleware.ts`, que verifica o cookie HttpOnly `wayon_session_user_id` e redireciona usuários não autenticados para `/login`. A proteção é reforçada por `app/(app)/layout.tsx`, que valida a sessão no servidor.

As páginas parametrizadas são `app/not-found.tsx` para 404, `app/forbidden/page.tsx` para acesso negado e `app/error.tsx`/`global-error.tsx` para erros inesperados. Nenhuma dessas camadas substitui a autorização no backend.

O backend é a autoridade para identidade, sessão e autorização.

### Microsoft Entra ID

O login corporativo usa OAuth 2.0 / OpenID Connect. O frontend inicia o fluxo no backend em `/api/auth/entra/login`; o callback `/api/auth/entra/callback` valida o `state`, troca o `code`, consulta a identidade e cria uma sessão HttpOnly. O backend é a única camada que conhece o segredo.

Todas as configurações ficam em `back-end/.env`, carregadas por `python-dotenv`: `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET`, `ENTRA_REDIRECT_URI`, `ENTRA_SCOPES`, `ENTRA_GROUPS` e `ENTRA_GROUP_SYNC_ENABLED`. Os valores reais não devem estar no frontend, em `NEXT_PUBLIC_*`, em logs ou no Git; use `back-end/.env.example` apenas como modelo.

`ENTRA_GROUPS` aceita IDs ou nomes separados por vírgula. O backend registra grupos e o último login na auditoria, e rejeita configuração parcial na inicialização.

### Login

O login local recebe um e-mail, procura um usuário ativo em `users` e cria uma sessão protegida por cookie. Não existe cadastro automático pelo frontend.

### Perfis e escopo

O usuário possui um `perfil_id` com ID fixo e permissões associadas. O catálogo está em `perfis`; o campo `role` é legado e permanece somente para compatibilidade. Cada consulta precisa validar:

- usuário autenticado;
- vínculo com o projeto;
- acesso ao arquivo;
- permissão para a ação solicitada.

### Boas práticas

- Usar HTTPS em produção;
- Habilitar cookies `Secure` em produção;
- Restringir CORS;
- Validar entradas com Pydantic;
- Usar queries parametrizadas;
- Não registrar tokens ou segredos nos logs;
- Nunca usar `localStorage` para sessão ou credenciais.

---

## 12. Padrões de desenvolvimento

### Nova tabela

Adicione model, migration, schema, repository/service, controller, testes e a entrada correspondente em [Tabelas e campos](#7-tabelas-e-campos). Teste banco vazio e banco já populado.

### Novo endpoint

Defina método, path, autenticação, payload, respostas e erros. Implemente o controller, conecte o hook do frontend, atualize o [Mapa API x frontend](#10-mapa-api-x-frontend) e valide no Swagger.

### Nova página

Crie a rota em `app/`, extraia componentes reutilizáveis, use tokens existentes e implemente loading, estado vazio, erro, acessibilidade e responsividade.

### Checklist

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm test:e2e

cd ../backend
python -m compileall -q app alembic
python -m pytest -q
```

---

## 13. Testes e resultados

Execute os comandos abaixo na ordem. Um resultado **bom** termina com código `0`, sem `Error`, `Failed`, `Type error`, `Traceback` ou `ModuleNotFoundError`. Um resultado **ruim** termina com código diferente de `0`, apresenta falhas ou impede o fluxo principal; corrija o primeiro erro real antes de analisar mensagens posteriores.

### Frontend: tipos, lint e build

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm build
```

Bom: typecheck, lint e build terminam sem erros; o build é gerado. Warnings devem ser avaliados, mas não equivalem automaticamente a falha. Ruim: erro de TypeScript, falha do ESLint ou build interrompido.

### Backend: compilação, dependências e testes

```bash
cd back-end
python -m compileall -q app alembic
python -m pip check
python -m pytest -q
ruff check .
```

Bom: `compileall` não imprime erros, `pip check` informa que não há dependências quebradas e o pytest mostra `passed` com código `0`. Ruim: traceback, teste `failed`, `error`, sintaxe inválida ou módulo ausente. Se `pytest` não estiver instalado, instale `requirements.txt` antes de concluir o diagnóstico.

### E2E e validação manual

```bash
pnpm test:e2e
```

Valide login, Wiki Dev, navegação, API, estados de carregamento/vazio/erro e responsividade. Bom: smoke test sem timeout e tela funcional. Ruim: página em branco, erro no console, timeout ou endpoint inesperadamente 4xx/5xx.

### Evidência no PR

Registre comandos, resultado (passou/falhou), quantidade de testes, warnings relevantes e prints/logs quando necessário. Nunca oculte uma falha: informe o bloqueio e o impacto.

---

## 14. Branches, commits e PRs

A padronização usa o identificador da demanda para facilitar rastreabilidade e revisão.

### Branch

A branch deve ser criada a partir de `develop`:

```text
<tipo>/STS<numero>-<descricao-curta>

Exemplo:
feature/STS0233556-exportacao-relatorio
```

### Commit

```text
<tipo>(<escopo>): STS<numero> <mensagem>

Exemplos:
feat(api): STS0233556 criar endpoint de exportacao
feat(ui): STS0233556 criar validacao de campo data
```

### Pull Request para develop

Título:

```text
[STS<numero>] <titulo>
```

O PR deve apontar para `develop` e conter link do ServiceNow, contexto, alterações, como testar, evidências, impactos, riscos e checklist.

### Template automático

O arquivo [`.github/pull_request_template.md`](.github/pull_request_template.md) é preenchido automaticamente ao abrir um PR. Mantenha suas seções e marque somente itens realmente verificados.

### Fluxo recomendado

```bash
git switch develop
git pull origin develop
git switch -c feature/STS0233556-exportacao-relatorio
git add .
git commit -m "feat(api): STS0233556 criar endpoint de exportacao"
git push -u origin feature/STS0233556-exportacao-relatorio
```

---

## 15. Troubleshooting

### Preview não abre

Confirme que o Next foi iniciado dentro de ``, que `pnpm install` terminou e que a porta está livre. Reinicie o servidor após alterar `package.json` ou variáveis de ambiente.

### Frontend sem dados

Verifique:

1. Backend rodando em `localhost:8080`;
2. `NEXT_PUBLIC_API_BASE_URL` em `.env.local`;
3. `CORS_ORIGINS` incluindo `http://localhost:3000`;
4. [Health check](http://localhost:8080/health) respondendo;
5. Console e Network do navegador.

### SQLite ou migration falha

```bash
cd back-end
alembic current
alembic history
```

Confira permissões de escrita em `back-end/data/` e faça backup antes de qualquer rename.

### Erro 401 ou 403

- `401`: sessão ausente ou expirada;
- `403`: perfil sem permissão.

Confira o e-mail seed, cookies, CORS e autorização do controller. Não remova a proteção para contornar o erro.

### Build falha

Execute `pnpm typecheck`, `pnpm lint` e `pnpm build` separadamente. Corrija o primeiro erro real; mensagens posteriores podem ser consequência dele.

---

## 16. Deploy

Frontend e backend devem ser publicados como serviços separados.

### Frontend

Configure `NEXT_PUBLIC_API_BASE_URL` com a URL HTTPS pública da API. Execute o build a partir da raiz do repositório. Não inclua `.env.local` ou segredos no bundle.

### Backend

Use PostgreSQL, aplique migrations como etapa controlada, restrinja CORS ao domínio do frontend, habilite cookies Secure, desative seed automático após a carga inicial e monitore `/health`.

### Release segura

1. Fazer backup;
2. Revisar migrations;
3. Validar variáveis;
4. Testar login e autorização;
5. Conferir logs sem dados sensíveis;
6. Monitorar erros;
7. Manter plano de rollback.

SQLite não deve ser usado como base persistente em uma implantação com múltiplas instâncias.

---

## 17. Integração corporativa CAV4 e Entra ID

O login corporativo ainda está em fase de preparação. A aplicação mantém o login local com usuários persistidos no backend; não se deve tratar o login local como integração SSO ou como autenticação mockada.

A arquitetura recomendada é OpenID Connect sobre OAuth 2.0, usando Authorization Code + PKCE com o Microsoft Entra ID. O backend deve validar o retorno do provedor, identificar o colaborador por `oid`/`sub`, localizar ou provisionar o usuário local e aplicar os perfis e permissões do SIGAC. Tokens não devem ser armazenados em `localStorage`; a sessão deve usar cookie seguro e HttpOnly.

O CAV4 deve ser integrado somente após o time proprietário fornecer seu contrato oficial: mecanismo de autenticação, endpoints, scopes, claims, grupos, certificado ou metadata, ambientes e regras de autorização. Não invente endpoints ou permissões do CAV4.

Consulte o checklist completo em [`docs/integracao-login-corporativo-cav4-entraid.md`](docs/integracao-login-corporativo-cav4-entraid.md), que documenta:

- informações necessárias do Entra ID e do CAV4;
- permissões, claims, grupos e App Roles;
- endpoints internos e externos;
- variáveis de ambiente;
- segurança, homologação, produção e rollback.

---

## 18. Referências do repositório

- [README único do projeto](README.md)
- [Modelo visual de dados em PDF](docs/SIGAC-modelo-dados.pdf)
- [Schema SQLite](back-end/database/sqlite-schema.sql)
- [Endpoints documentados](docs/api-endpoints.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Integração corporativa CAV4 e Entra ID](docs/integracao-login-corporativo-cav4-entraid.md)
- [Schema SQLite](back-end/database/sqlite-schema.sql)
- [Wiki Dev](wiki-dev.md)

---

## Manutenção desta documentação

Ao alterar tabelas, endpoints, páginas, scripts ou estrutura de pastas, atualize este arquivo. A Wiki Dev é exclusivamente este Markdown; não existe uma página visual equivalente. Evite copiar blocos inteiros de outros documentos: mantenha aqui a referência consolidada e use links para a fonte técnica específica quando houver detalhes adicionais.
