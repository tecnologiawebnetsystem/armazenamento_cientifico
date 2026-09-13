# Readme — SIGAC

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
| Readme | Este arquivo `readme.md` |
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

O valor de `DATABASE_ENGINE` decide o driver usado pela API. Nunca versionar credenciais reais; use as variáveis de ambiente do projeto ou o arquivo `.env` local não versionado.

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

O frontend está na raiz do repositório, é uma aplicação Next.js 16 com App Router e consome exclusivamente a API FastAPI configurada em `NEXT_PUBLIC_API_BASE_URL`. A camada visual não acessa o banco e não implementa autorização definitiva.

| Pasta/arquivo | Responsabilidade |
|---|---|
| [`app/`](app/) | Rotas, layouts, estados de carregamento e tratamento de erros. |
| [`app/(app)/`](app/(app)/) | Área protegida: dashboard, projetos, pesquisas, relatórios e logs. |
| [`app/login/`](app/login/) | Tela de login local e corporativo. |
| [`components/`](components/) | Componentes de layout, domínio e apresentação. |
| [`components/ui/`](components/ui/) | Componentes acessíveis baseados em shadcn/ui. |
| [`hooks/`](hooks/) | Hooks de login, arquivos, catálogos, solicitações e auditoria. |
| [`lib/api-client.ts`](lib/api-client.ts) | Cliente HTTP único, cookies, tratamento de erros e downloads. |
| [`lib/session.ts`](lib/session.ts) | Leitura da sessão do backend para Server Components. |
| [`lib/types.ts`](lib/types.ts) | Tipos compartilhados das respostas e modelos da API. |
| [`public/`](public/) | Arquivos estáticos. |
| [`tests/`](tests/) | Testes E2E, quando presentes. |
| [`app/globals.css`](app/globals.css) | Tokens, tema e estilos globais Tailwind v4. |
| [`package.json`](package.json) | Scripts e dependências do frontend. |

### Fluxo de dados

1. A página ou componente usa um hook ou uma função de `lib/api-client.ts`.
2. O cliente envia `fetch` ao FastAPI com `credentials: include` e `cache: no-store`.
3. O backend valida sessão, payload e permissão.
4. O componente atualiza loading, dados, estado vazio ou erro.

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

O backend em [`back-end/`](back-end/) é um serviço FastAPI. Ele concentra autenticação, autorização, regras de negócio, validação, auditoria e persistência. A organização atual combina módulos por domínio com uma camada legada mantida apenas para compatibilidade.

| Pasta/arquivo | Responsabilidade |
|---|---|
| [`back-end/app/app.py`](back-end/app/app.py) | Cria a aplicação, CORS, headers, handlers e registro de routers. |
| [`back-end/app/api/routes/`](back-end/app/api/routes/) | Rotas transversais, como health e autenticação corporativa. |
| [`back-end/app/api/dependencies.py`](back-end/app/api/dependencies.py) | Resolve usuário da sessão e dependências de autorização. |
| [`back-end/app/api/legacy.py`](back-end/app/api/legacy.py) | Endpoints legados e compatibilidade OpenAPI. |
| [`back-end/app/core/`](back-end/app/core/) | Configuração, autorização, segurança, Entra ID, CAV4, erros e logs. |
| [`back-end/app/db/`](back-end/app/db/) | Pool/conexão, base e seed do banco. |
| [`back-end/app/modules/projects/`](back-end/app/modules/projects/) | Controllers, schemas, services, repositories e models de projetos. |
| [`back-end/app/modules/files/`](back-end/app/modules/files/) | Arquivos, pastas e permissões de arquivos. |
| [`back-end/app/modules/audit/`](back-end/app/modules/audit/) | Registro e consulta de auditoria. |
| [`back-end/app/modules/users/`](back-end/app/modules/users/) | Modelos de usuários, perfis e permissões. |
| [`back-end/alembic/versions/`](back-end/alembic/versions/) | Migrations versionadas. |
| [`back-end/database/`](back-end/database/) | Schemas SQL de referência. |
| [`back-end/tests/`](back-end/tests/) | Testes de contrato, autorização, schemas, rotas e PostgreSQL. |

### Camadas de um domínio

`module.py` registra o router; `controller.py` trata HTTP; `schemas.py` valida DTOs; `service.py` orquestra regras; `repository.py` concentra consultas; `models.py` representa persistência. Nem todo módulo possui todas as camadas, mas novos endpoints devem preservar essa separação.

---

## 6. Banco de dados

O SiGAC utiliza exclusivamente as tabelas da aplicação definidas em [`back-end/database/postgresql-schema.sql`](back-end/database/postgresql-schema.sql). Tabelas criadas automaticamente por Neon, como as relacionadas à autenticação gerenciada, não fazem parte deste inventário porque não são utilizadas pelo sistema.

### Ciclo de mudança

1. Alterar o model SQLAlchemy;
2. Criar uma migration Alembic incremental;
3. Revisar o SQL e comparar com o PostgreSQL;
4. Fazer backup antes de alterar dados;
5. Aplicar a migration em ambiente controlado;
6. Validar tabelas, campos, PKs, FKs e contagens;
7. Atualizar esta documentação.

Não altere uma migration já aplicada sem confirmar o impacto na API.

---

## 7. Tabelas, campos, PKs e FKs

A lista abaixo contém somente as tabelas utilizadas pelo SiGAC no schema `public`. Os campos representam os nomes físicos definidos no schema PostgreSQL; `*` identifica a chave primária.

| Tabela | Campos físicos | PK | FKs declaradas |
|---|---|---|---|
| `schema_migrations` | `version*`, `applied_at` | `version` | — |
| `profiles` | `id*`, `name`, `description`, `created_at` | `id` | — |
| `users` | `id*`, `name`, `email`, `job_title`, `area`, `role`, `profile_id`, `avatar_url`, `last_login_at`, `created_at` | `id` | `profile_id -> profiles.id` |
| `modules` | `id*`, `name`, `route`, `icon`, `display_order`, `active` | `id` | — |
| `permissions` | `id*`, `module_id`, `name`, `description`, `active` | `id` | `module_id -> modules.id` |
| `profile_permissions` | `profile_id*`, `permission_id*`, `allowed` | `(profile_id,permission_id)` | `profile_id -> profiles.id`; `permission_id -> permissions.id` |
| `profile_modules` | `profile_id*`, `module_id*`, `can_view` | `(profile_id,module_id)` | `profile_id -> profiles.id`; `module_id -> modules.id` |
| `project_statuses` | `id*`, `code`, `name`, `color`, `display_order`, `active`, `allows_edit` | `id` | — |
| `project_types` | `id*`, `code`, `name`, `description`, `active` | `id` | — |
| `system_settings` | `key*`, `value`, `value_type`, `description`, `group_name`, `active` | `key` | — |
| `report_types` | `id*`, `code`, `name`, `description`, `formats`, `active` | `id` | — |
| `report_fields` | `id*`, `report_code`, `field_key`, `label`, `source_key`, `display_order`, `active` | `id` | `report_code -> report_types.code` |
| `menus` | `id*`, `module_id`, `parent_id`, `name`, `route`, `icon`, `display_order`, `active` | `id` | `module_id -> modules.id` |
| `projects` | `id*`, `name`, `code`, `responsible_area`, `managers_ids`, `write_group`, `read_group`, `write_identity_role`, `read_identity_role`, `snow_task_number`, `parent_folder`, `description`, `status`, `participants_ids`, `created_at`, `updated_at` | `id` | — |
| `project_members` | `project_id*`, `user_id*`, `role`, `created_at` | `(project_id,user_id)` | `project_id -> projects.id`; `user_id -> users.id` |
| `files` | `id*`, `project_id`, `parent_id`, `kind`, `name`, `size_bytes`, `mime_type`, `created_by`, `last_viewed_at`, `created_at`, `updated_at` | `id` | `project_id -> projects.id`; `parent_id -> files.id`; `created_by -> users.id` |
| `file_shares` | `file_id*`, `user_id*`, `access_level`, `created_at` | `(file_id,user_id)` | `file_id -> files.id`; `user_id -> users.id` |
| `groups` | `id*`, `name`, `description`, `created_at` | `id` | — |
| `group_members` | `group_id*`, `user_id*`, `created_at` | `(group_id,user_id)` | `group_id -> groups.id`; `user_id -> users.id` |
| `file_permissions` | `file_id*`, `user_id`, `group_id`, `access_level`, `inherited_from`, `created_at` | não declarada | `file_id -> files.id`; `user_id -> users.id`; `group_id -> groups.id` |
| `access_requests` | `id*`, `project_id`, `requester_id`, `status`, `created_at` | `id` | `project_id -> projects.id`; `requester_id -> users.id` |
| `activity_logs` | `id*`, `user_id`, `action`, `entity`, `entity_id`, `details`, `created_at` | `id` | `user_id -> users.id` |
| `sessions` | `id*`, `user_id`, `expires_at` | `id` | `user_id -> users.id` |
| `permission_matrix` | `id*`, `matrix` | `id` | — |

---

## 8. Modelagem e diagrama

O modelo abaixo representa somente as tabelas utilizadas pelo SiGAC e os relacionamentos declarados no schema PostgreSQL. Tabelas auxiliares do Neon ou de outros serviços externos foram omitidas.

```mermaid
erDiagram
  PROFILES ||--o{ USERS : possui
  MODULES ||--o{ PERMISSIONS : define
  PROFILES ||--o{ PROFILE_MODULES : acessa
  MODULES ||--o{ PROFILE_MODULES : habilita
  PROFILES ||--o{ PROFILE_PERMISSIONS : recebe
  PERMISSIONS ||--o{ PROFILE_PERMISSIONS : concede
  REPORT_TYPES ||--o{ REPORT_FIELDS : possui
  MODULES ||--o{ MENUS : organiza
  PROJECTS ||--o{ PROJECT_MEMBERS : possui
  USERS ||--o{ PROJECT_MEMBERS : participa
  PROJECTS ||--o{ FILES : contém
  FILES ||--o{ FILES : organiza
  USERS ||--o{ FILES : cria
  FILES ||--o{ FILE_SHARES : compartilha
  USERS ||--o{ FILE_SHARES : recebe
  GROUPS ||--o{ GROUP_MEMBERS : possui
  USERS ||--o{ GROUP_MEMBERS : participa
  FILES ||--o{ FILE_PERMISSIONS : protege
  USERS ||--o{ FILE_PERMISSIONS : recebe
  GROUPS ||--o{ FILE_PERMISSIONS : recebe
  PROJECTS ||--o{ ACCESS_REQUESTS : recebe
  USERS ||--o{ ACCESS_REQUESTS : solicita
  USERS ||--o{ ACTIVITY_LOGS : gera
  USERS ||--o{ SESSIONS : possui
```

## 9. API e endpoints

A API REST do SiGAC é fornecida pelo FastAPI em `back-end/`. O contrato publicado deve ser consultado no [Swagger](http://localhost:8080/docs), no [ReDoc](http://localhost:8080/redoc) ou no [`OpenAPI JSON`](http://localhost:8080/openapi.json) quando a documentação estiver habilitada.

### Grupos principais

| Grupo | Endpoints utilizados | Finalidade |
|---|---|---|
| Health | `GET /health`, `/health/live`, `/health/ready`, `/health/database` | Disponibilidade da aplicação e do banco. |
| Autenticação | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session` | Login local, encerramento e consulta da sessão. |
| Login corporativo | `GET /api/auth/cav4/start`, `GET /api/auth/cav4/callback` | Fluxo corporativo CAV4/OIDC. |
| Catálogos e diretório | `GET /api/catalogos`, `/api/users`, `/api/perfis`, `/api/permissions` | Dados auxiliares para telas e autorização. |
| Projetos | `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/{id}` | CRUD, áreas, mapa de acesso e membros. |
| Arquivos | `GET/POST /api/files`, `GET/PATCH/DELETE /api/files/{id}` | Pastas, arquivos e metadados. |
| Compartilhamento | `/api/files/{id}/permissions` | Concessão e remoção de acesso a arquivos. |
| Dashboard | `GET /api/dashboard/summary` | Indicadores da área autenticada. |
| Auditoria | `GET /api/activity-logs` | Consulta dos eventos do sistema. |
| Relatórios | `GET /api/reports`, `/api/reports/export`, `/api/report-fields` | Consulta e exportação CSV, TXT e PDF. |
| Acesso | `GET /api/access-map`, `/api/access-map/export` | Visão e exportação do mapa de acesso. |

A implementação modular está em `back-end/app/modules/`. `back-end/app/api/legacy.py` permanece somente para compatibilidade com contratos antigos; novas funcionalidades devem ser implementadas nos módulos de domínio.

### Contrato de resposta e erros

As requisições do frontend usam JSON, cookies de sessão e `cache: no-store`. Respostas de erro seguem `error`, `message` e, quando necessário, `details`. Os códigos mais usados são `200`/`201` para sucesso, `204` sem conteúdo, `401` sessão inválida, `403` acesso negado, `404` recurso inexistente, `409` conflito, `422` validação e `500` erro interno.

---

## 10. Mapa API x frontend

| Domínio | Endpoints | Arquivos frontend existentes |
|---|---|---|
| Cliente HTTP | Todos | [`lib/api-client.ts`](lib/api-client.ts) |
| Login e sessão | `/api/auth/login`, `/api/auth/logout`, `/api/auth/session` | [`hooks/use-login.ts`](hooks/use-login.ts), [`app/login/page.tsx`](app/login/page.tsx), [`lib/session.ts`](lib/session.ts) |
| Login corporativo | `/api/auth/cav4/start` | [`hooks/use-login.ts`](hooks/use-login.ts) |
| Catálogos | `/api/catalogos`, `/api/projects/areas` | [`hooks/use-catalogs.ts`](hooks/use-catalogs.ts) |
| Projetos | `/api/projects`, `/api/projects/{id}`, `/api/projects/{id}/access-map` | [`app/(app)/projetos/`](app/(app)/projetos/), [`components/project-form.tsx`](components/project-form.tsx) |
| Membros e solicitações | `/api/projects/{id}/members`, `/api/access-requests` | [`components/projects/project-members-tab.tsx`](components/projects/project-members-tab.tsx), [`components/administracao/access-requests-queue.tsx`](components/administracao/access-requests-queue.tsx) |
| Arquivos | `/api/files`, `/api/files/{id}`, `/api/files/{id}/permissions` | [`hooks/use-files.ts`](hooks/use-files.ts), [`components/projects/project-file-explorer.tsx`](components/projects/project-file-explorer.tsx) |
| Dashboard | `/api/dashboard/summary` | [`app/(app)/dashboard/page.tsx`](app/(app)/dashboard/page.tsx), [`components/dashboard/`](components/dashboard/) |
| Auditoria | `/api/activity-logs` | [`hooks/use-activity-logs.ts`](hooks/use-activity-logs.ts), [`app/(app)/logs/page.tsx`](app/(app)/logs/page.tsx) |
| Relatórios | `/api/reports`, `/api/reports/export`, `/api/report-fields` | [`app/(app)/relatorios/page.tsx`](app/(app)/relatorios/page.tsx), [`components/export-fields-dialog.tsx`](components/export-fields-dialog.tsx) |

### Como rastrear uma chamada

1. Comece na página ou componente que dispara a ação.
2. Localize o hook ou função correspondente em `lib/api-client.ts`.
3. Procure o endpoint no controller modular ou em `back-end/app/api/legacy.py`.
4. Confira schema, regra de autorização, consulta e resposta.
5. Atualize esta tabela quando o contrato ou a tela mudar.

---

## 11. Autenticação e permissões

### Sessão

O login local envia o e-mail para `POST /api/auth/login`. O backend valida o usuário ativo em `users`, cria um registro em `sessions` e devolve um cookie HttpOnly com o nome configurado em `COOKIE_NAME`. O frontend usa `credentials: include`; não armazena sessão, token ou credencial em `localStorage`.

A proteção principal ocorre no backend por `get_current_user`, que lê o cookie, verifica a sessão e sua expiração. O layout [`app/(app)/layout.tsx`](app/(app)/layout.tsx) também consulta a sessão no servidor e redireciona para `/login` quando necessário.

### Login corporativo

O botão corporativo inicia `GET /api/auth/cav4/start`. O backend conduz o fluxo OAuth 2.0/OpenID Connect, valida `state`, troca o código no provedor CAV4 e cria a mesma sessão HttpOnly após identificar o usuário. Segredos e configurações ficam somente no backend (`CAV4_*`); nunca use valores `NEXT_PUBLIC_*` para credenciais.

### Autorização

As dependências `require_roles()` e `require_capabilities()` são aplicadas nas rotas protegidas. O backend deve validar usuário autenticado, perfil/capability necessária, vínculo com o projeto e acesso ao arquivo. `PermissionGuard` e elementos ocultos no frontend são apenas recursos de UX e nunca substituem essa verificação.

### Boas práticas

- HTTPS e `Secure` no cookie em produção;
- CORS restrito aos domínios conhecidos;
- queries parametrizadas e validação Pydantic;
- nenhum token ou segredo em logs, código ou frontend;
- retornar `401` para sessão ausente/expirada e `403` para permissão insuficiente;
- invalidar a sessão no logout e respeitar sua expiração.

---

## 12. Padrões de desenvolvimento

### Backend e banco

Para uma alteração persistente, atualize model/schema, migration Alembic, repository/service, controller, testes e os itens 6–8 desta documentação. Migrations devem ser incrementais, revisadas e compatíveis com banco vazio e banco já populado.

### Novo endpoint

Defina método, path, autenticação, capability, payload, respostas e códigos de erro. Implemente no módulo de domínio seguindo `controller → schema → service → repository`; use a camada legada somente quando for necessário preservar um contrato existente. Adicione a função do `lib/api-client.ts`, hook ou Server Component consumidor, teste de contrato e entrada no item 10.

### Nova tela ou componente

Crie a rota em `app/`, mantenha componentes de domínio separados, reutilize `components/ui/`, use TypeScript estrito e estados de carregamento, vazio e erro. Preserve acessibilidade, responsividade e o padrão visual definido em `app/globals.css`; chamadas HTTP devem passar pelo cliente centralizado.

### Checklist antes de publicar

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm test:e2e

cd back-end
uv run ruff check app alembic scripts tests
uv run pytest -q
uv run alembic check
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

O CAV4 deve ser integrado somente após o time proprietário fornecer seu contrato oficial: mecanismo de autentica��ão, endpoints, scopes, claims, grupos, certificado ou metadata, ambientes e regras de autorização. Não invente endpoints ou permissões do CAV4.

Consulte o checklist completo em [`docs/integracao-login-corporativo-cav4-entraid.md`](docs/integracao-login-corporativo-cav4-entraid.md), que documenta:

- informações necess��rias do Entra ID e do CAV4;
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

---

## Manutenção desta documentação

Ao alterar tabelas, endpoints, páginas, scripts ou estrutura de pastas, atualize este arquivo. A Wiki Dev é exclusivamente este Markdown; não existe uma página visual equivalente. Evite copiar blocos inteiros de outros documentos: mantenha aqui a referência consolidada e use links para a fonte técnica específica quando houver detalhes adicionais.
