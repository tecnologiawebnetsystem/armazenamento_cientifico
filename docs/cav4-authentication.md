# Login corporativo CAV4

A estrutura do login corporativo está preparada, mas permanece desativada até o contrato técnico oficial do CAV4 ser recebido.

## Fluxo reservado

1. Front-end chama `GET /api/auth/cav4/start`.
2. Backend cria `state`/PKCE e redireciona para o CAV4.
3. CAV4 retorna `code` e `state` para `/api/auth/cav4/callback`.
4. Backend troca o código, valida a identidade e normaliza `subject`, `email`, `roles` e `permissions`.
5. Backend cria a sessão local e aplica o mapeamento de permissões.

## Configuração futura

```env
CAV4_ENABLED=false
CAV4_BASE_URL=
CAV4_CLIENT_ID=
CAV4_CLIENT_SECRET=
CAV4_REDIRECT_URI=http://localhost:8080/api/auth/cav4/callback
CAV4_SCOPES=openid profile email
```

Não preencher valores inventados. O contrato precisa informar método, endpoints, claims, escopos, autenticação, logout, timeout e regras de sessão. Segredos ficam somente no backend; nunca devem ser enviados ao navegador ou registrados em logs.

Enquanto `CAV4_ENABLED=false`, o endpoint responde `503 CAV4_NOT_CONFIGURED`. Isso é intencional e evita simular autenticação real.
