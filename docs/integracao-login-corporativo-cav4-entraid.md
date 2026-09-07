# Integração do login corporativo — CAV4 e Microsoft Entra ID

**Projeto:** SIGAC / armazenamento_cientifico  
**Status:** documento de preparação técnica  
**Última atualização:** 07/09/2026  

## 1. Objetivo

Este documento descreve o que deve ser levantado e configurado para integrar o login corporativo da aplicação com o CAV4 e o Microsoft Entra ID (antigo Azure AD). Ele separa claramente:

- o que já existe na aplicação;
- o que o Entra ID fornece por OpenID Connect (OIDC);
- o que precisa ser confirmado com o time responsável pelo CAV4;
- quais endpoints são internos e quais são externos;
- quais permissões e informações são necessárias para desenvolvimento, homologação e produção.

> **Importante:** CAV4 é tratado aqui como um sistema corporativo externo cujo contrato técnico ainda precisa ser confirmado. Não devem ser inventados endpoints, scopes, claims ou formatos de token do CAV4 sem documentação oficial do proprietário do serviço.

## 2. Estado atual identificado

### 2.1 Frontend

- Aplicação Next.js com App Router.
- Tela de login própria em `/login`.
- Cliente HTTP centralizado em `frontend/lib/api-client.ts`.
- Proxy de frontend em `frontend/proxy.ts`.
- Sessão consumida pelos componentes autenticados por meio de `frontend/hooks/use-session.ts`.
- A interface já possui controle de navegação e ações por perfil.

### 2.2 Backend

- API Python/FastAPI.
- Rotas de autenticação e compatibilidade concentradas parcialmente em `backend/app/legacy_api.py`.
- Dependências de autenticação/autorização em `backend/app/api/dependencies.py`.
- Regras de perfil em `backend/app/core/authorization.py`.
- Usuário de aplicação persistido no módulo `backend/app/modules/users`.
- Os perfis funcionais atuais incluem Administrador, Gerente, Patrocinador, Auditor e Solicitante.

### 2.3 Consequência para o SSO

A integração não deve confiar apenas no token recebido do provedor. O fluxo recomendado é:

1. Entra ID autentica o colaborador.
2. A aplicação valida o código/token conforme OIDC.
3. A aplicação identifica o usuário corporativo por `oid` ou `sub` estável.
4. A aplicação localiza ou provisiona o usuário interno.
5. A aplicação aplica seus próprios perfis, escopos e permissões.
6. A sessão interna é criada com os dados mínimos necessários.

## 3. Arquitetura recomendada

```text
Navegador
   |
   | 1. Authorization Code + PKCE
   v
SIGAC Frontend / Backend
   |
   | 2. Redirecionamento para o tenant corporativo
   v
Microsoft Entra ID
   |
   | 3. ID token / authorization code
   v
SIGAC Backend
   |
   | 4. Descoberta/provisionamento de usuário
   +--------------------+
   |                    |
   v                    v
Banco do SIGAC       CAV4, se necessário
```

### Decisão recomendada

- Usar **OpenID Connect sobre OAuth 2.0** com fluxo **Authorization Code + PKCE**.
- Manter o segredo `client_secret` somente no backend quando o aplicativo for confidential client.
- Não armazenar access tokens no `localStorage`.
- Usar cookies de sessão `HttpOnly`, `Secure` e `SameSite` compatíveis com o domínio publicado.
- Separar tenants/clients de desenvolvimento, homologação e produção.

## 4. Informações necessárias do time corporativo

Solicitar os seguintes dados ao time de identidade:

### 4.1 Entra ID

- Tenant ID (`directory_id`).
- Domínio verificado do tenant.
- Tipo de conta permitida: somente organização, múltiplos tenants ou contas Microsoft.
- Client ID da aplicação registrada.
- Client secret ou certificado, se o cliente for confidential.
- Data de expiração e processo de rotação do segredo/certificado.
- Redirect URI de desenvolvimento.
- Redirect URI de homologação.
- Redirect URI de produção.
- Front-channel logout URL, se utilizado.
- Post-logout redirect URI.
- Endpoints OIDC oficiais do tenant.
- Política de Conditional Access aplicável.
- Requisitos de MFA, dispositivo gerenciado e localização de rede.

### 4.2 CAV4

Confirmar oficialmente:

- Nome completo do produto e equipe proprietária.
- Ambiente de desenvolvimento, homologação e produção.
- Método de integração: OIDC, SAML 2.0, OAuth 2.0, API REST, SOAP ou outro.
- Se o CAV4 é o IdP, um broker de identidade ou apenas um sistema consumidor.
- URL de discovery/metadata.
- Issuer, authorization endpoint, token endpoint e logout endpoint, se OIDC.
- Entity ID, SSO URL e certificado X.509, se SAML.
- Base URL, endpoints, scopes e método de autenticação, se API.
- Regras de rede: VPN, allowlist de IP, private link, mTLS ou proxy.
- Formato de identificador do usuário.
- Atributos/claims liberados.
- Grupos ou funções enviados pelo CAV4.
- Limites de requisição, timeout e política de retry.
- Processo de revogação e desligamento de usuários.
- Contato de suporte e janela de mudança.

## 5. Permissões recomendadas no Entra ID

A configuração mínima deve começar com escopo de identidade. Só solicitar permissões adicionais se uma funcionalidade realmente precisar delas.

### 5.1 OpenID Connect básico

Para login e identificação:

- `openid` — obrigatório para ID token.
- `profile` — nome, sobrenome e informações básicas do perfil.
- `email` — email quando disponibilizado pelo tenant.
- `offline_access` — somente se a aplicação precisar renovar acesso sem novo login; evitar se uma sessão curta for suficiente.

### 5.2 Microsoft Graph — somente se necessário

O login básico não exige leitura ampla do Graph. Caso seja necessário consultar grupos ou dados corporativos, validar com o time de segurança uma destas opções:

- `User.Read` — leitura do perfil do usuário autenticado.
- `GroupMember.Read.All` — leitura de associação a grupos; é privilegiada e normalmente requer consentimento administrativo.
- `Directory.Read.All` — evitar por ser ampla; usar somente com justificativa formal.

Não solicitar `Mail.*`, `Files.*`, `Sites.*`, `Calendars.*` ou permissões administrativas se o SIGAC não tiver uma funcionalidade que dependa delas.

### 5.3 App roles preferíveis a grupos quando possível

Para autorização corporativa, preferir **App Roles** dedicadas ao SIGAC, por exemplo:

- `SIGAC.Admin` — administração do sistema.
- `SIGAC.Manager` — gestão operacional.
- `SIGAC.Sponsor` — acompanhamento/patrocínio.
- `SIGAC.Auditor` — consulta de auditoria.
- `SIGAC.Requester` — abertura e acompanhamento de solicitações.

A aplicação deve mapear essas roles para seus perfis internos. A atribuição final de acesso deve continuar sendo validada no backend.

## 6. Claims e informações esperadas

### 6.1 Claims mínimos

| Claim | Uso | Obrigatório |
|---|---|---:|
| `iss` | Validar emissor e tenant | Sim |
| `aud` | Validar client ID da aplicação | Sim |
| `exp` | Validar expiração | Sim |
| `iat` | Validar emissão | Recomendado |
| `nbf` | Validar início de validade | Recomendado |
| `tid` | Confirmar tenant corporativo | Sim |
| `oid` | Identificador estável do usuário no tenant | Sim |
| `sub` | Identificador do sujeito no contexto do aplicativo | Sim |
| `name` | Nome de exibição | Recomendado |
| `preferred_username` | Login/identificador apresentado pelo Entra | Recomendado |
| `email` | Email, quando fornecido | Opcional |
| `roles` | App Roles do SIGAC | Se adotado |
| `groups` | Grupos do Entra | Somente se aprovado |

### 6.2 Identidade local

Persistir no usuário interno, no mínimo:

- `entra_tenant_id`;
- `entra_object_id` (`oid`);
- `subject` (`sub`), se necessário para o contexto do client;
- email corporativo;
- nome completo;
- status ativo/inativo;
- perfil SIGAC;
- data do último login;
- data de sincronização dos atributos;
- origem do cadastro: `entra_id`, `cav4` ou manual;
- identificador do CAV4, quando existir.

Não usar email como chave primária de identidade, pois ele pode mudar.

## 7. Endpoints externos esperados

Os valores abaixo são padrões OIDC e devem ser substituídos pelos valores oficiais do tenant:

```text
GET  https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration
GET  https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize
POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
GET  https://graph.microsoft.com/oidc/userinfo       (se habilitado/necessário)
POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/logout
```

A aplicação deve obter os endpoints pelo documento de discovery quando possível, em vez de duplicar URLs em vários arquivos.

### CAV4

Os endpoints do CAV4 não devem ser codificados antes da confirmação do contrato. Criar uma tabela de preenchimento na homologação:

| Finalidade | Método | URL | Auth | Timeout |
|---|---|---|---|---:|
| Discovery/metadata | GET | A confirmar | Público ou mTLS | A confirmar |
| Autorização | GET | A confirmar | OIDC/SAML | A confirmar |
| Troca de token | POST | A confirmar | OAuth/mTLS | A confirmar |
| Perfil/usuário | GET | A confirmar | Bearer/mTLS | A confirmar |
| Logout/revogação | POST/GET | A confirmar | Conforme contrato | A confirmar |
| Consulta de grupos/roles | GET | A confirmar | Conforme contrato | A confirmar |

## 8. Endpoints internos que deverão existir

Os nomes abaixo são uma proposta de contrato interno. Devem ser implementados em uma única camada, sem duplicar a mesma responsabilidade em `legacy_api.py` e nos módulos novos.

```text
GET  /auth/entra/login
GET  /auth/entra/callback
POST /auth/logout
GET  /auth/session
GET  /auth/me
POST /auth/refresh              (somente se houver refresh token)
GET  /auth/health/identity      (admin/observabilidade)
```

Se o CAV4 participar diretamente do login, acrescentar somente após definir o fluxo:

```text
GET  /auth/cav4/login
GET  /auth/cav4/callback
GET  /auth/cav4/metadata
```

### Regras dos endpoints internos

- `callback` deve validar `state`, `nonce`, PKCE e troca de código no servidor.
- Validar assinatura, `iss`, `aud`, `tid`, `exp`, `nbf` e nonce do ID token.
- Não aceitar perfil vindo apenas do navegador.
- `auth/session` deve retornar somente dados necessários para a UI.
- `logout` deve invalidar a sessão local e redirecionar para logout do provedor, quando exigido.
- Endpoints administrativos devem usar as dependências de autorização existentes.
- Registrar auditoria sem armazenar tokens ou dados excessivos.

## 9. Mapeamento de autorização

| Identidade corporativa | Perfil interno | Acesso esperado |
|---|---|---|
| `SIGAC.Admin` | Administrador | Usuários, perfis, configurações, auditoria e todos os módulos |
| `SIGAC.Manager` | Gerente | Gestão operacional e projetos conforme escopo |
| `SIGAC.Sponsor` | Patrocinador | Consulta e acompanhamento de projetos atribuídos |
| `SIGAC.Auditor` | Auditor | Consulta, relatórios e trilhas de auditoria |
| `SIGAC.Requester` | Solicitante | Criação e acompanhamento de solicitações próprias |

Se uma pessoa possuir mais de uma role, definir precedência ou permitir composição explícita. O backend deve negar por padrão quando nenhuma role estiver mapeada.

## 10. Segurança e conformidade

- Usar Authorization Code + PKCE.
- Nunca expor client secret no frontend.
- Nunca guardar tokens em `localStorage`.
- Usar cookies `HttpOnly`, `Secure` e política `SameSite` adequada.
- Restringir `redirect_uri` a URLs exatas.
- Validar tenant e issuer; não aceitar qualquer tenant.
- Validar audience específica da aplicação.
- Implementar proteção CSRF/state e nonce.
- Aplicar timeout, retry limitado e circuit breaker para CAV4.
- Redigir tokens, secrets e PII nos logs.
- Configurar rotação de secrets/certificados.
- Definir processo de desligamento e revogação.
- Aplicar menor privilégio no Graph.
- Manter trilha de auditoria para login, logout, falha, provisionamento e alteração de perfil.
- Não permitir que claims de grupo substituam as permissões de escopo do SIGAC.

## 11. Ambientes e variáveis necessárias

### Desenvolvimento

```text
IDENTITY_PROVIDER=entra
ENTRA_TENANT_ID=
ENTRA_CLIENT_ID=
ENTRA_CLIENT_SECRET=
ENTRA_ISSUER=
ENTRA_AUTHORITY=
ENTRA_REDIRECT_URI=
ENTRA_POST_LOGOUT_REDIRECT_URI=
ENTRA_ALLOWED_ROLES=SIGAC.Admin,SIGAC.Manager,SIGAC.Sponsor,SIGAC.Auditor,SIGAC.Requester
CAV4_BASE_URL=
CAV4_CLIENT_ID=
CAV4_CLIENT_SECRET=
CAV4_ISSUER=
CAV4_AUDIENCE=
```

As variáveis do CAV4 só devem ser preenchidas quando o contrato for confirmado. Secrets devem ficar no gerenciador de segredos do ambiente, nunca no Git.

## 12. Checklist de homologação

### Identidade

- [ ] Login com usuário permitido.
- [ ] Login com usuário não atribuído ao aplicativo.
- [ ] MFA e Conditional Access.
- [ ] Token expirado.
- [ ] Issuer, audience ou tenant inválidos.
- [ ] Usuário sem email.
- [ ] Alteração de nome/email.
- [ ] Usuário desabilitado no Entra.
- [ ] Usuário sem App Role.
- [ ] Usuário com múltiplas App Roles.
- [ ] Logout local e logout federado.
- [ ] Repetição de callback e replay de `state`.

### Autorização

- [ ] Cada perfil acessa somente seus módulos.
- [ ] Ações ocultadas no frontend também são recusadas no backend.
- [ ] Projetos/pastas respeitam escopo individual.
- [ ] Auditoria registra sucesso e falha sem token.
- [ ] Alteração de perfil exige permissão administrativa.

### Integração CAV4

- [ ] Discovery/metadata oficial validado.
- [ ] Certificados e cadeia TLS aprovados.
- [ ] Allowlist/VPN/mTLS testados.
- [ ] Timeout e indisponibilidade testados.
- [ ] Respostas inválidas e rate limit tratados.
- [ ] Correlação de usuário CAV4 x Entra x SIGAC validada.

## 13. Entregáveis solicitados ao time corporativo

1. Documento de arquitetura do CAV4.
2. Metadata/discovery de cada ambiente.
3. Cadastro do aplicativo no Entra ID.
4. Client ID, tenant ID e mecanismo de secret/certificado.
5. Redirect URIs aprovadas.
6. App Roles ou grupos aprovados.
7. Claims liberados e exemplo de token redigido.
8. Endpoints externos e requisitos de rede.
9. Procedimentos de rotação e revogação.
10. Usuários de teste por perfil.
11. Critérios de aceite e evidências de homologação.
12. Contatos de suporte, segurança e identidade.

## 14. Pontos que ainda precisam de decisão

- O CAV4 autentica diretamente ou o Entra ID será o único IdP?
- O SIGAC precisa consultar dados do CAV4 durante o login ou somente receber identidade do Entra?
- A autorização virá de App Roles, grupos do Entra, perfis do CAV4 ou combinação?
- Haverá provisionamento automático ou aprovação manual do usuário interno?
- Qual é o identificador corporativo oficial para correlação?
- O acesso será somente pela rede corporativa ou também via internet com Conditional Access?
- O logout deve encerrar a sessão somente no SIGAC ou também no Entra/CAV4?
- Qual é o SLA esperado para indisponibilidade do CAV4?

## 15. Critério de pronto

A integração estará pronta quando:

- o fluxo de login estiver documentado e aprovado pelo time de identidade;
- todos os endpoints externos tiverem owner, ambiente e contrato;
- as App Roles/permissões estiverem aprovadas;
- nenhum secret estiver no código ou no Git;
- usuários de teste cobrirem os cinco perfis;
- o backend validar tokens independentemente da UI;
- logout, revogação, auditoria e indisponibilidade tiverem testes;
- homologação tiver evidências anexadas ao change request.

## Referências oficiais

- Microsoft identity platform — OpenID Connect: https://learn.microsoft.com/entra/identity-platform/v2-protocols-oidc
- Microsoft identity platform — OAuth 2.0 authorization code flow: https://learn.microsoft.com/entra/identity-platform/v2-oauth2-auth-code-flow
- Microsoft Graph permissions reference: https://learn.microsoft.com/graph/permissions-reference
- Microsoft identity platform — app roles: https://learn.microsoft.com/entra/identity-platform/howto-add-app-roles-in-apps
