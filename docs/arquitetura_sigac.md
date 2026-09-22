# SIGAC — Arquitetura e Modelagem

**Versão:** 3.0
**Status:** referência vigente do SIGAC
**Escopo:** autenticação corporativa CAV4 e autorização parametrizada pelo banco do SIGAC

## 1. Decisão arquitetural

O SIGAC é composto por um frontend Next.js e um backend FastAPI. O **CAV4 é usado exclusivamente para autenticar a identidade corporativa**. Depois do callback, o backend extrai o e-mail autenticado, localiza o usuário na tabela `users` e carrega perfil, módulos, menus e permissões exclusivamente do banco do SIGAC.

```text
Usuário
  -> Frontend SIGAC: login corporativo
  -> Backend SIGAC: fluxo OIDC CAV4
  -> CAV4: autenticação e identidade
  -> Backend: extrai e-mail e subject/chave CAV4
  -> Banco SIGAC: users -> profiles -> modules/menus/permissions
  -> Sessão HttpOnly
  -> Dashboard e menus autorizados
```

A POC `cav4-integracao/` é somente referência técnica. Ela não participa do runtime do SIGAC e não deve ser alterada para corrigir ou implementar funcionalidades do sistema principal.

## 2. Responsabilidades

| Componente | Responsabilidade |
|---|---|
| Frontend Next.js | Login, dashboard, perfil, menus e estados da interface. |
| Backend FastAPI | OIDC CAV4, sessão, validação, autorização, auditoria e API. |
| CAV4 | Autenticar o usuário e fornecer identidade corporativa. |
| PostgreSQL/Aurora | Usuários, perfis, módulos, menus, permissões, projetos, relatórios e auditoria. |
| Armazenamento | Origem consultiva de pastas e permissões físicas, quando habilitado. |

O CAV4 **não define** permissões funcionais do SIGAC. Claims, grupos e roles externos podem ser armazenados como informação de identidade, mas não substituem `profiles`, `profile_modules`, `profile_permissions` ou `menu_permissions`.

## 3. Camadas

1. **Apresentação:** páginas e componentes Next.js.
2. **Transporte:** routers FastAPI, schemas e dependências HTTP.
3. **Aplicação:** services e casos de uso.
4. **Domínio:** regras de perfil, permissão, projeto e relatório.
5. **Persistência:** models SQLAlchemy, repositories e migrations Alembic.
6. **Infraestrutura:** CAV4, PostgreSQL, configuração, logs e deploy.

Fluxo obrigatório:

```text
Route -> Service -> Repository -> SQLAlchemy -> PostgreSQL
                         -> Adapter CAV4 (somente autenticação)
```

## 4. Autenticação corporativa

1. O usuário clica em **Login corporativo**.
2. O frontend chama `GET /api/auth/cav4/start`.
3. O backend gera `state`, `nonce` e, quando aplicável, PKCE.
4. O usuário autentica no CAV4.
5. O callback troca o código e valida issuer, audience, assinatura, nonce, state e expiração.
6. O backend obtém o e-mail e o subject/chave da identidade.
7. O e-mail é usado para localizar o usuário ativo em `users`.
8. O backend carrega o `profile_id`, módulos, menus e permissões locais.
9. A sessão é criada em cookie HttpOnly/Secure conforme o ambiente.
10. O frontend acessa a dashboard e exibe somente os recursos retornados pelo SIGAC.

Usuário autenticado no CAV4 sem cadastro ativo no SIGAC não recebe acesso à área protegida. O e-mail é a chave de correlação funcional nesta fase; o subject/chave CAV4 deve ser mantido na sessão e pode ser exibido no perfil, sem expor tokens.

## 5. Autorização parametrizada

A autorização segue a cadeia:

```text
users.profile_id
  -> profiles
  -> profile_modules.can_view
  -> menus / menu_permissions
  -> permissions / profile_permissions.allowed
  -> endpoint e regra de negócio
```

- `profile_modules` controla a visibilidade do módulo.
- `menus` define os itens e rotas disponíveis.
- `menu_permissions` vincula perfil, menu e permissão quando houver controle específico por item.
- `profile_permissions` controla as capacidades funcionais.
- O backend repete a verificação em cada operação protegida.
- O frontend apenas reflete a autorização recebida; ocultar um botão não é uma barreira de segurança.

O perfil administrador deve possuir acesso a todos os módulos ativos, menus ativos e permissões ativas por meio de seed/migration idempotente. Consulte `back-end/database/0032_seed_admin_menu_permissions.sql` e `0033_corrigir_permissoes_e_catalogos.sql`.

## 6. Modelo de dados vigente

| Grupo | Tabelas | Finalidade |
|---|---|---|
| Identidade | `users`, `profiles` | Cadastro local, vínculo por e-mail e perfil efetivo. |
| Navegação | `modules`, `menus`, `dashboard_cards` | Módulos, menus e cards exibidos no SIGAC. |
| Autorização | `permissions`, `profile_permissions`, `profile_modules`, `menu_permissions` | Controle parametrizado de capacidades, módulos e menus. |
| Projetos | `projects`, `project_members`, `access_requests` | Projetos, participantes e solicitações de acesso. |
| Relatórios | `report_types`, `report_fields` | Catálogo e campos configuráveis de relatórios. |
  | Catálogos | `project_statuses`, `project_types`, `responsible_areas` | Dados parametrizáveis do sistema. |
| Auditoria | `activity_logs` | Eventos de autenticação, autorização e operações. |
| Arquivos | `folders` | Consulta somente leitura da estrutura autorizada. |

As alterações estruturais devem ser feitas por migrations Alembic. Scripts SQL em `back-end/database/` são seeds/correções controladas e devem ser idempotentes, transacionais e revisados antes da execução.

## 7. Segurança

- Cookies de sessão HttpOnly, Secure em HTTPS e SameSite conforme o ambiente.
- CORS restrito às origens do frontend.
- Queries parametrizadas e validação Pydantic.
- Tokens, secrets e credenciais nunca aparecem em logs ou no frontend.
- `401` para sessão ausente/expirada e `403` para autorização insuficiente.
- Auditoria de login, logout, falhas e alterações administrativas.
- Startup não cria schema nem executa seeds automaticamente em produção.

## 8. Critérios de aceite

- A POC permanece intacta e é usada apenas para consulta.
- O login corporativo inicia somente após o clique.
- O CAV4 autentica; o SIGAC localiza o usuário pelo e-mail.
- Perfil, menus, dashboard e permissões vêm do banco do SIGAC.
- Administrador acessa todos os módulos, menus e permissões ativas.
- Usuário sem cadastro/perfil ativo não acessa o SIGAC.
- Cada endpoint protegido valida a autorização no backend.
- A página de perfil pode exibir e-mail, nome, perfil e chave/subject CAV4 sem tokens.

## 9. Referências

- [Variáveis de ambiente CAV4](variaveis-ambiente-cav4.md)
- [Fluxo de login corporativo CAV4](integracao-login-corporativo-cav4-entraid.md)
- [`back-end/database/0032_seed_admin_menu_permissions.sql`](../back-end/database/0032_seed_admin_menu_permissions.sql)
- [`back-end/database/0033_corrigir_permissoes_e_catalogos.sql`](../back-end/database/0033_corrigir_permissoes_e_catalogos.sql)
- [README do SIGAC](../README.md)

A POC não é fonte de configuração, banco ou autorização do SIGAC.

## 10. Operação e validação

```bash
pnpm typecheck
pnpm lint
pnpm build
cd back-end
uv run ruff check app alembic scripts tests
uv run pytest -q
uv run alembic check
```

Valide manualmente: login corporativo, consulta do usuário pelo e-mail, carregamento do perfil, menus, dashboard, permissões de administrador, bloqueio de usuário não cadastrado e exibição segura da identidade no perfil.

O PDF formal, quando necessário, é gerado por `back-end/scripts/generate_architecture_pdf.py`.
