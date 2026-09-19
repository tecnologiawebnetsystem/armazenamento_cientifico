# SIGAC — Arquitetura da Solução

**Versão:** 2.1  
**Status:** baseline técnico para validação do gestor e arquitetura  
**Escopo:** primeira fase do Sistema de Gestão de Acesso ao Armazenamento Científico

## 1. Decisão arquitetural principal

O SIGAC adota arquitetura web corporativa em camadas, modular por domínio, com Next.js no frontend e FastAPI no backend. O CAV4 é a autoridade de autenticação e identidade. Nesta fase, o Aurora PostgreSQL é a autoridade do SIGAC para perfil, permissões, menu e autorização das operações.

A regra central é:

```text
CAV4 (autenticação e identidade)
  -> e-mail/subject validado
  -> localização do usuário no banco SIGAC
  -> perfil e permissões do banco
  -> sessão segura
  -> menu contextual no frontend
  -> validação novamente em cada endpoint
```

O frontend melhora a experiência e esconde ações indisponíveis, mas nunca concede autorização. O backend é a autoridade de segurança.

## 2. Princípios

- CAV4 autentica; o banco SIGAC define o perfil e as permissões locais.
- Usuário autenticado sem cadastro ou perfil no banco não acessa o SIGAC.
- Contratos estáveis: rotas, endpoints e regras de negócio permanecem preservados.
- Separação entre apresentação, aplicação, domínio, persistência e infraestrutura.
- Segredos, tokens e senhas nunca são registrados em logs.
- Evolução incremental com separação explícita entre implementado, dependente e futuro.

## 3. Componentes

| Componente | Responsabilidade |
| --- | --- |
| Browser | Interface corporativa e interação do usuário |
| Next.js | App Router, layout, componentes, hooks e cliente HTTP |
| FastAPI | APIs, sessões, regras, validação e autorização |
| CAV4 | Autenticação OIDC, subject e e-mail validados |
| Aurora PostgreSQL | Usuários locais, projetos, catálogos, auditoria e configurações |
| Servidor de armazenamento | Origem das pastas e permissões consultivas |

## 4. Camadas

1. **Apresentação:** páginas Next.js, componentes compartilhados, menus e estados.
2. **Transporte:** routers FastAPI, DTOs, autenticação e tratamento HTTP.
3. **Aplicação:** services e casos de uso.
4. **Domínio:** entidades, perfis, capacidades e regras de autorização.
5. **Persistência:** repositories, SQLAlchemy async e migrations Alembic.
6. **Infraestrutura:** CAV4, Aurora, rede, configuração e observabilidade.

## 5. Autenticação e autorização

### 5.1 Sessão existente

Ao entrar no sistema, o backend valida se há sessão SIGAC válida. Havendo sessão, recupera o usuário e o perfil do banco e redireciona para `/dashboard`. Sem sessão válida, conduz o usuário ao login corporativo CAV4.

### 5.2 Login corporativo

O fluxo usa Authorization Code/OIDC: state e nonce são gerados, o CAV4 autentica, o callback troca o código por tokens, valida issuer/audience/assinatura/expiração e cria a sessão segura.

### 5.3 Perfil e permissões no banco

O backend usa o e-mail e o subject autenticados pelo CAV4 para localizar o usuário pré-cadastrado no banco SIGAC. O perfil ligado ao usuário (`users.profile_id`) e as permissões ativas (`profile_permissions`) são carregados do banco. Claims de papéis ou grupos do CAV4 são apenas informativos nesta fase e não bloqueiam o login.

### 5.4 Frontend

A sessão expõe papel efetivo, roles e permissões para construir menus e ações contextuais. Isso é ergonomia, não segurança. Toda operação sensível passa por guardas do backend.

## 6. Escopo da primeira fase

Inclui autenticação CAV4, consulta de grupos/roles, projetos, relatórios, listagem de pastas e exibição de permissões de leitura/escrita.

Não inclui criação, renomeação ou exclusão de pastas; upload, download, edição ou exclusão de arquivos; nem alteração física de permissões do servidor de armazenamento.

## 7. Persistência

O Aurora utiliza PostgreSQL, UUIDs, foreign keys, índices e migrations versionadas. O schema físico deve ser criado por Alembic ou pelo script SQL aprovado pelo DBA. O usuário da aplicação deve ter apenas os grants necessários.

Entidades principais: `users`, `profiles`, `projects`, `project_members`, `folders`, `access_requests`, `activity_logs` e catálogos.

## 8. Segurança e operação

- Cookies HttpOnly, Secure e SameSite conforme o ambiente aprovado.
- CORS limitado às origens autorizadas.
- Queries parametrizadas e validação Pydantic.
- Logs com request_id, rota, status e duração, sem credenciais ou tokens.
- Auditoria para login, logout, alterações e consultas administrativas.
- Health checks distinguindo aplicação e dependências.
- Migrations executadas com identidade controlada; startup não cria schema automaticamente.

## 9. Responsabilidades externas

| Responsável | Decisão necessária |
| --- | --- |
| CAV4/identidade | Claims oficiais, grupos, roles e contrato OIDC |
| DBA | Banco, schema, grants, migrations e backup |
| Segurança | Cookies, CORS, retenção, auditoria e threat model |
| Infraestrutura | VPN/VPC, DNS, Security Group e disponibilidade |
| Gestor | Perfis, alçadas e escopo funcional |
| Produto/QA | Critérios de aceite e testes dos fluxos |

## 10. Critérios de aceite

- Usuário com sessão CAV4 válida não repete login.
- Usuário sem sessão é encaminhado ao CAV4.
- Usuário sem papel reconhecido não entra no SIGAC.
- Menus refletem o papel efetivo, sem substituir guards da API.
- Rotas e endpoints existentes permanecem compatíveis.
- Auditoria não expõe segredos.
- DBA e Segurança aprovam a configuração de produção.

O PDF formal desta arquitetura é gerado por `back-end/scripts/generate_architecture_pdf.py` em `docs/SIGAC-arquitetura.pdf`.
