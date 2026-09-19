# Variáveis de ambiente — SIGAC e CAV4

## Conclusão da comparação

A POC `cav4-integracao` não possui um arquivo `.env.example`. A referência dela é `cav4-integracao/backend/config.py`, que usa principalmente:

- `CA_CLIENT_ID`
- `CA_CLIENT_SECRET`
- `CA_REDIRECT_URI`
- `CA_SCOPES`
- `OIDC_DISCOVERY_URL`
- `CA_API_BASE_URL`
- `CA_SSL_VERIFY`
- `CA_SSL_USE_TRUSTSTORE`
- `CA_SSL_CERT_FILE`
- credenciais opcionais do Microsoft Graph, usadas apenas pela POC para consultas ao Graph

O SIGAC atual usa o mesmo núcleo de autenticação CAV4. Depois do callback, o backend valida a identidade, extrai o e-mail e consulta o usuário, perfil e permissões nas tabelas do SIGAC. O CAV4 não deve fornecer as permissões funcionais do sistema.

## Arquivos de configuração

- Frontend: `.env.example`
- Backend: `back-end/.env.example`
- Desenvolvimento: `back-end/.env`, não versionado
- Homologação e produção: variáveis configuradas no ambiente de execução ou no Secret Manager

O arquivo `back-end/.env.example` foi reduzido ao conjunto usado pelo runtime atual. Variáveis de Entra ID, aliases de configuração não necessários no exemplo e variáveis de Docker/JFrog não fazem parte do fluxo padrão; as últimas ficaram apenas como bloco opcional.

## Variáveis necessárias

### Banco

É necessário informar `RDS_AURORA_POSTGRES_URL` ou o conjunto de conexão Aurora (`RDS_AURORA_POSTGRES_HOST`, `RDS_AURORA_POSTGRES_USERNAME`, `RDS_AURORA_POSTGRES_PASSWORD` e `RDS_AURORA_POSTGRES_DATABASE`). Também são necessários `DB_SCHEMA` e os parâmetros de pool/TLS conforme a infraestrutura.

### Aplicação

`ENVIRONMENT`, `FRONTEND_URL`, `CORS_ORIGINS`, `COOKIE_NAME`, `COOKIE_SECURE`, `SESSION_HOURS`, `API_PREFIX` e `PORT` controlam URLs, cookies, sessão e exposição HTTP. `LOG_LEVEL`, `LOG_FORMAT`, `EXPOSE_API_DOCS`, `SECURITY_HEADERS_ENABLED` e `AUDIT_RETENTION_DAYS` controlam operação e segurança.

`EMAIL_LOGIN_ENABLED` deve permanecer `false` quando o CAV4 for o único método de login. `TEMPORARY_CAV4_SESSION` deve permanecer `false` fora de testes locais sem banco.

### CAV4

Quando `CAV4_ENABLED=true`, são obrigatórias:

- `CA_CLIENT_ID`
- `CA_CLIENT_SECRET`
- `CA_REDIRECT_URI`
- `OIDC_DISCOVERY_URL`

`CA_SCOPES` deve conter, no mínimo, `openid profile email`. `CA_API_BASE_URL` é necessária para consultas à API do CAV4, quando o fluxo usar essa API. `CA_USERINFO_URL` só é necessário se o e-mail não vier no `id_token` e precisar ser consultado no endpoint `userinfo`.

`CA_ISSUER` e `CA_JWKS_URL` são substitutos opcionais quando o discovery não retornar `issuer` ou `jwks_uri`. `CA_SSL_CERT_FILE` só é necessário quando o servidor não confia na CA corporativa pelo truststore do sistema. `CAV4_JWT_LEEWAY_SECONDS` possui valor padrão de 120 segundos.

## Matriz por ambiente

| Variável | Local | Homologação | Produção |
|---|---|---|---|
| `ENVIRONMENT` | `development` | `homologation` | `production` |
| `FRONTEND_URL` | `http://localhost:3000` | URL oficial do frontend HML | URL oficial do frontend PROD |
| `CORS_ORIGINS` | localhost e 127.0.0.1 | somente domínio HML | somente domínio PROD |
| `RDS_AURORA_POSTGRES_URL` | banco local/DSV | endpoint Aurora HML | endpoint Aurora PROD |
| `DB_SCHEMA` | schema local/DSV | schema HML | schema PROD |
| `COOKIE_SECURE` | `false` em HTTP local | `true` | `true` |
| `EXPOSE_API_DOCS` | `true` | conforme política de rede | normalmente `false` |
| `CA_REDIRECT_URI` | `http://localhost:8080/api/auth/cav4/callback` | callback HTTPS HML cadastrado no CAV4 | callback HTTPS PROD cadastrado no CAV4 |
| `OIDC_DISCOVERY_URL` | endpoint CAV4 de DSV, se disponível | endpoint CAV4 HML | endpoint CAV4 PROD |
| `CA_API_BASE_URL` | API CAV4 de DSV | API CAV4 HML | API CAV4 PROD |
| `CA_SSL_VERIFY` | `false` somente para destravar testes locais | `true` | `true` |
| `CA_SSL_USE_TRUSTSTORE` | conforme máquina local | `true` quando a CA estiver instalada | `true` |
| `CA_SSL_CERT_FILE` | caminho local opcional | caminho do bundle corporativo, se necessário | caminho do bundle corporativo, se necessário |
| `LOG_FORMAT` | `pretty` | `json` recomendado | `json` recomendado |
| `LOG_LEVEL` | `INFO` ou `DEBUG` | `INFO` | `INFO` ou `WARNING` |

Os valores exatos de HML e PROD dependem dos domínios, endpoints, client IDs, secrets e bancos fornecidos pela infraestrutura. Eles não devem ser gravados neste repositório.

## Regras de segurança

1. Nunca versionar `CA_CLIENT_SECRET`, senhas de banco, tokens ou API keys.
2. Nunca colocar credenciais CAV4 no `.env.example` do frontend.
3. Usar `CA_SSL_VERIFY=true` em homologação e produção.
4. Usar `COOKIE_SECURE=true` em qualquer ambiente HTTPS.
5. Não usar `CORS_ORIGINS=*` em homologação ou produção.
6. Cadastrar cada `CA_REDIRECT_URI` exatamente no ambiente correspondente do CAV4.
7. Após a autenticação CAV4, aplicar as permissões do SIGAC pelo banco; não confiar em roles recebidas do frontend.

## Variáveis removidas do modelo padrão

- `ENTRA_*`: o fluxo atual do SIGAC não usa Entra ID diretamente.
- `CAV4_*` duplicadas: o padrão oficial da POC é `CA_*`; o código ainda mantém aliases antigos por compatibilidade.
- `CA_AUTHORIZATION_URL`, `CA_TOKEN_URL` e `CA_LOGOUT_URL`: discovery é o caminho principal e esses campos não são usados pelo fluxo atual.
- `JFROG_*` e `IMAGE_TAG`: pertencem ao processo de build/deploy, não ao runtime da API.
- `GRAPH_*`: pertencem à POC quando há consultas independentes ao Microsoft Graph e não são necessários para autenticar o usuário no SIGAC.

## Verificação operacional

Depois de preencher o ambiente, valide nesta ordem:

1. `GET /health` responde sem erro de configuração.
2. `GET /api/auth/cav4/start` redireciona para o CAV4.
3. O callback retorna para a URI registrada.
4. O backend localiza o e-mail na tabela de usuários.
5. O backend carrega perfil, módulos, menus e permissões do SIGAC.
6. A dashboard mostra somente os recursos autorizados pelo banco.

Se o CAV4 autenticar e o usuário não aparecer, o problema é de cadastro ou vínculo no SIGAC, não de permissão do token corporativo.
