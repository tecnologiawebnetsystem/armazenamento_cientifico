# Readme — SIGAC

> Documentação técnica consolidada do **Sistema de Gestão de Acesso ao Armazenamento Científico (SIGAC)**.
>
> A aplicação é dividida em duas partes independentes: a aplicação web na raiz, em Next.js, e [`back-end/`](back-end/), em FastAPI.

## Índice

- [1. Visão geral](#1-visão-geral)
- [2. Como executar](#2-como-executar)
- [3. PostgreSQL passo a passo](#3-postgresql-passo-a-passo)
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

- **Python 3.11 ou superior**, com **FastAPI**, **SQLAlchemy 2.0**, **Pydantic 2**, **Alembic** e **PostgreSQL**.
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
- PostgreSQL 14 ou superior, com acesso ao banco e permissão para executar migrations;

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

## 3. PostgreSQL passo a passo

O SiGAC utiliza PostgreSQL como banco de dados relacional da aplicação. O banco concentra usuários, perfis, projetos, arquivos, vínculos de acesso, solicitações e registros de auditoria, enquanto o backend FastAPI centraliza as regras de negócio e o acesso aos dados.

### Configuração pelo `.env`

Defina as variáveis no arquivo `back-end/.env` local, que não deve ser versionado:

```env
DATABASE_ENGINE=postgresql
DATABASE_URL=postgresql://usuario:senha@host:5432/sigac?sslmode=require
SEED_DATABASE=false
CORS_ORIGINS=http://localhost:3000
COOKIE_SECURE=false
ENVIRONMENT=development
```

Em ambientes HTTPS compartilhados ou de produção, use o domínio real do frontend, habilite `COOKIE_SECURE=true` e mantenha `sslmode=require` na conexão. Nunca versionar credenciais reais ou expor a URL do banco no frontend.

### Criar e atualizar tabelas

As alterações estruturais devem ser feitas por migrations versionadas do Alembic:

```bash
cd back-end
uv sync --dev
uv run alembic upgrade head
uv run alembic current
uv run alembic history
```

O schema de referência está em [`back-end/database/postgresql-schema.sql`](back-end/database/postgresql-schema.sql). Antes de alterar uma tabela, crie uma migration incremental, revise as chaves e índices e valide a compatibilidade com os models SQLAlchemy.

### Seed e usuários iniciais

O seed é controlado por `SEED_DATABASE`. Quando habilitado em um ambiente de desenvolvimento, cria apenas registros iniciais que ainda não existem. Em ambientes compartilhados ou de produção, mantenha `SEED_DATABASE=false` após a carga inicial e altere dados por migrations ou rotinas administrativas controladas.

### Verificar o banco

- Consulte a API pelo [Swagger](http://localhost:8080/docs) ou pelo [ReDoc](http://localhost:8080/redoc);
- Use um cliente PostgreSQL para inspecionar o schema e os dados;
- Execute `uv run alembic check` antes de publicar alterações;
- Faça backup antes de migrations destrutivas ou operações de manutenção;
- Restrinja o acesso do banco à aplicação e às ferramentas administrativas necessárias.

### Boas práticas operacionais

- Utilize conexões TLS e credenciais armazenadas somente em variáveis de ambiente;
- Conceda ao usuário da aplicação apenas as permissões necessárias;
- Não exponha o PostgreSQL diretamente pelo frontend nem crie endpoints que repassem credenciais;
- Monitore conexões, erros de migration, latência e espaço disponível;
- Teste migrations em uma cópia controlada antes de aplicá-las no ambiente compartilhado.

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

O SiGAC utiliza PostgreSQL como banco de dados relacional. A estrutura abaixo apresenta as tabelas utilizadas pelo sistema, conforme definidas no schema [`back-end/database/postgresql-schema.sql`](back-end/database/postgresql-schema.sql).

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

## 7. Tabelas

A lista abaixo apresenta somente as tabelas utilizadas pelo SiGAC, com seus campos físicos, chaves primárias e chaves estrangeiras no PostgreSQL. `*` identifica a chave primária.

| Tabela | Campos físicos | PK | FKs declaradas |
|---|---|---|---|
| `profiles` | `id*`, `name`, `description`, `created_at` | `id` | — |
| `users` | `id*`, `name`, `email`, `job_title`, `area`, `role`, `profile_id`, `avatar_url`, `last_login_at`, `created_at` | `id` | `profile_id -> profiles.id` |
| `modules` | `id*`, `name`, `route`, `icon`, `display_order`, `active` | `id` | — |
| `permissions` | `id*`, `module_id`, `name`, `description`, `active` | `id` | `module_id -> modules.id` |
| `profile_permissions` | `profile_id*`, `permission_id*`, `allowed` | `(profile_id,permission_id)` | `profile_id -> profiles.id`; `permission_id -> permissions.id` |
| `profile_modules` | `profile_id*`, `module_id*`, `can_view` | `(profile_id,module_id)` | `profile_id -> profiles.id`; `module_id -> modules.id` |
| `project_statuses` | `id*`, `code`, `name`, `color`, `display_order`, `active`, `allows_edit` | `id` | — |
| `project_types` | `id*`, `code`, `name`, `description`, `active` | `id` | — |
| `responsible_areas` | `id*`, `name`, `prefix`, `next_number`, `active`, `created_at`, `updated_at` | `id` | — |
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

O modelo abaixo representa as tabelas utilizadas pelo SiGAC e seus relacionamentos no PostgreSQL. O diagrama mostra as tabelas, as chaves estrangeiras e os vínculos entre os dados do sistema.

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

Os testes confirmam que frontend, backend, banco e integração entre as camadas continuam funcionando depois de uma alteração. Execute primeiro as verificações rápidas e, depois, os testes de integração e E2E. O resultado só deve ser considerado aprovado quando o comando termina com código `0` e não há falhas bloqueadoras.

### Verificações do frontend

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm build
```

O `typecheck` detecta contratos inválidos entre componentes e API; o `lint` verifica padrões do código; o `build` confirma que o App Router pode ser compilado para publicação. Warnings devem ser avaliados, mas erros de TypeScript, ESLint ou build impedem a aprovação.

### Verificações do backend

```bash
cd back-end
python -m compileall -q app alembic
python -m pip check
python -m pytest -q
ruff check .
```

O `compileall` identifica erros de sintaxe, o `pip check` detecta dependências incompatíveis, o `pytest` valida regras e endpoints e o Ruff verifica qualidade estática. Um traceback, teste `failed`, módulo ausente ou dependência quebrada deve ser corrigido antes do merge.

### Teste integrado e validação manual

```bash
pnpm test:e2e
```

Valide o fluxo principal: abrir o login, autenticar, navegar pela área protegida, consultar projetos, arquivos, relatórios e logs, testar estados de carregamento/vazio/erro e confirmar a responsividade. Registre no PR os comandos executados, o resultado, a quantidade de testes, warnings relevantes e evidências necessárias.

---

## 14. Branches, commits e PRs

Branches, commits e Pull Requests devem permitir rastrear a demanda, entender o impacto da alteração e repetir sua validação. Nunca desenvolva diretamente em `main` ou `develop`.

### Branch de trabalho

Crie a branch a partir de `develop`, usando o tipo da mudança, o identificador STS e uma descrição curta:

```text
<tipo>/STS<numero>-<descricao-curta>

Exemplo:
feature/STS0233556-exportacao-relatorio
```

Use `feature` para funcionalidade, `fix` para correção, `refactor` para reorganização sem mudança funcional e `docs` para documentação.

### Commit

O commit deve ser pequeno, objetivo e seguir o formato:

```text
<tipo>(<escopo>): STS<numero> <mensagem>

Exemplos:
feat(api): STS0233556 criar endpoint de exportacao
fix(auth): STS0233556 corrigir expiracao da sessao
```

Não misture refatoração, correção não relacionada e alteração funcional no mesmo commit. A mensagem deve explicar a intenção, não apenas o arquivo alterado.

### Pull Request

O PR deve apontar para `develop`, ter título no formato `[STS<numero>] <titulo>` e informar contexto, problema, solução, arquivos ou módulos impactados, como testar, evidências, riscos, migrações e necessidade de configuração. O autor deve confirmar que testes relevantes passaram e que não há credenciais, banco local ou arquivos gerados incluídos.

O arquivo [`.github/pull_request_template.md`](.github/pull_request_template.md) deve ser preenchido com informações verificadas. Revisões devem avaliar comportamento, segurança, autorização, compatibilidade da API, migrations e impacto nas telas.

---

## 15. Troubleshooting

Use esta seção para localizar a camada responsável pelo problema. Comece pelo primeiro erro real nos logs; mensagens posteriores podem ser apenas consequência dele.

### Preview ou frontend não abre

Confirme que as dependências foram instaladas, que o Next foi iniciado na raiz do projeto, que a porta está livre e que as variáveis estão disponíveis. Depois execute `pnpm typecheck`, `pnpm lint` e `pnpm build` separadamente para identificar a etapa que falhou.

### Frontend abre, mas não exibe dados

Verifique, nesta ordem:

1. API disponível em `http://localhost:8080`;
2. `NEXT_PUBLIC_API_BASE_URL` configurada em `.env.local`;
3. `CORS_ORIGINS` incluindo `http://localhost:3000`;
4. [health check](http://localhost:8080/health) respondendo;
5. aba Network para status, URL e payload da requisição;
6. console do navegador para erros de JavaScript ou CORS.

Não altere o componente para ignorar erros: corrija a URL, CORS, sessão ou contrato responsável.

### Banco ou migration falha

```bash
cd back-end
alembic current
alembic history
alembic check
```

Confira `DATABASE_ENGINE`, `DATABASE_URL`, permissões de escrita em `back-end/data/`, estado da migration e existência das tabelas. Faça backup antes de renomear ou remover dados e não edite uma migration já aplicada sem planejar a compatibilidade.

### Erro 401 ou 403

`401` significa que a sessão está ausente, inválida ou expirada; `403` significa que o usuário está autenticado, mas não possui a capability, perfil ou vínculo necessário. Inspecione cookie, CORS, e-mail do usuário, sessão no banco e dependência de autorização do endpoint. Nunca remova a proteção para contornar o erro.

### API retorna 404, 422 ou 500

`404` normalmente indica rota ou identificador incorreto; `422` indica payload incompatível com o schema; `500` exige consultar os logs do backend e a causa original. Compare a chamada com o OpenAPI, valide o payload no frontend e confirme se a mudança foi implementada no módulo correto.

---

## 16. Deploy

Frontend e backend são serviços independentes e devem ser publicados separadamente, com configuração explícita para o ambiente. O frontend conhece apenas a URL pública da API; segredos, credenciais de banco e configurações corporativas permanecem no backend.

### Frontend

Configure `NEXT_PUBLIC_API_BASE_URL` com a URL HTTPS da API, instale dependências pelo lockfile e execute `pnpm typecheck`, `pnpm lint` e `pnpm build`. Não publique `.env.local`, cookies, tokens ou qualquer segredo no bundle do Next.js.

### Backend

Use PostgreSQL em ambientes compartilhados, aplique as migrations Alembic como etapa controlada, restrinja `CORS_ORIGINS` ao domínio real, habilite `COOKIE_SECURE=true`, mantenha `ENVIRONMENT=production`, desative `SEED_DATABASE` após a carga inicial e monitore `/health` e os logs. O processo de execução deve ter acesso somente às variáveis necessárias.

### Checklist de release

1. Validar variáveis e URLs do ambiente;
2. Fazer backup do banco;
3. Revisar e aplicar migrations;
4. Publicar backend e confirmar health check;
5. Configurar o frontend para a API correta;
6. Testar login, logout, autorização, projetos e arquivos;
7. Conferir logs sem dados sensíveis;
8. Monitorar a primeira execução e manter rollback documentado.

SQLite é adequado para desenvolvimento local, mas não deve ser usado como banco persistente em implantação com múltiplas instâncias.

---

## 17. Integração corporativa CAV4 e Entra ID

O SIGAC possui login local funcional e mantém a integração corporativa como uma etapa dependente do contrato oficial dos sistemas CAV4 e Microsoft Entra ID. Login local não é SSO e não deve ser descrito como autenticação corporativa ou mockada.

### Fluxo corporativo esperado

A integração deve usar OpenID Connect sobre OAuth 2.0, preferencialmente Authorization Code + PKCE. O frontend inicia o fluxo, mas o backend é responsável por validar `state`, trocar o código, validar issuer, audience, assinatura e expiração dos tokens, identificar o colaborador por `oid` ou `sub`, localizar ou provisionar o usuário local e aplicar o perfil e as permissões do SIGAC.

Depois da validação, a aplicação deve criar a mesma sessão segura usada pelo login local. Tokens e credenciais não podem ser armazenados em `localStorage`, enviados em `NEXT_PUBLIC_*` ou registrados em logs; a sessão deve usar cookie `HttpOnly`, `Secure` em produção e política adequada de `SameSite`.

### Informações obrigatórias antes da implementação

O time proprietário deve fornecer o contrato oficial do CAV4/Entra ID: issuer e metadata, client ID, redirect URIs, scopes, claims, grupos ou App Roles, mapeamento de perfis, ambientes, certificados, política de logout e regras de provisionamento. Não invente endpoints, claims ou permissões que não estejam documentados.

O checklist está em [`docs/integracao-login-corporativo-cav4-entraid.md`](docs/integracao-login-corporativo-cav4-entraid.md) e deve ser atualizado junto com qualquer mudança de contrato, variável, ambiente ou regra de autorização.

---

## Manutenção desta documentação

Ao alterar tabelas, endpoints, páginas, scripts ou estrutura de pastas, atualize este arquivo. A Wiki Dev é exclusivamente este Markdown; não existe uma página visual equivalente. Evite copiar blocos inteiros de outros documentos: mantenha aqui a referência consolidada e use links para a fonte técnica específica quando houver detalhes adicionais.
