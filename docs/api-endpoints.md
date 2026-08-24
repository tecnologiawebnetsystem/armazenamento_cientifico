# API da plataforma

Todas as rotas exigem sessão, salvo login. Respostas de erro usam `{ "message": "..." }`.

## Autenticação

- `POST /api/auth/login` — payload `{ "email": "admin@demo.local", "senha": "..." }`; retorna `{ user }`.
- `POST /api/auth/logout` — sem payload; retorna `204`.
- `GET /api/auth/session` — sem payload; retorna `{ user }` ou `{ user: null }`.

## Projetos e membros

- `GET /api/projects` — query opcional `status`, `area`, `all`; retorna `{ projects }` já filtrados por escopo.
- `POST /api/projects` — payload: `nome`, `codigo`, `criadoEm`, `areaResponsavel`, `gestoresIds`, `grupoAdEscrita`, `grupoAdLeitura`, `roleIdentidadeEscrita`, `roleIdentidadeLeitura`, `numeroTarefaSnow`, `pastaMae`, `descricao`, `participantesIds`.
- `GET /api/projects/:id` — retorna `{ project }`.
- `PATCH /api/projects/:id` — payload parcial permitido: campos editáveis do projeto; não enviar `id` ou metadados protegidos. Retorna `{ project }`.
- `DELETE /api/projects/:id` — sem payload; retorna `204`.
- `GET /api/projects/:id/members` — retorna `{ members }`.
- `POST /api/projects/:id/members` — payload `{ "userId": "u-005", "papel": "participante" }`.
- `PATCH /api/projects/:id/members` — payload `{ "userId": "u-005", "papel": "gerente|participante|visualizador" }`.
- `DELETE /api/projects/:id/members?userId=u-005` — sem payload.

## Arquivos e acessos

- `GET /api/files?projectId=...&parentId=...` — retorna `{ files, breadcrumb }`; `allFolders=true` lista pastas.
- `POST /api/files` — payload `{ projectId, parentId, tipo: "pasta|arquivo", nome, tamanho?, mimeType? }`.
- `GET /api/files/:id` — retorna o recurso quando disponível.
- `PATCH /api/files/:id` — payload parcial `{ nome?, parentId? }`.
- `DELETE /api/files/:id` — sem payload.
- `POST /api/files/:id/share` — payload `{ "userId": "u-005", "nivel": "leitura|edicao" }`.
- `DELETE /api/files/:id/share?userId=...` — sem payload.
- `GET /api/access-map` — retorna usuários, projetos, pastas e arquivos acessíveis no escopo da sessão.

## Consultas, relatórios e auditoria

- `GET /api/reports?status=todos|ativo|suspenso|concluido&area=...&projectId=...` — retorna indicadores, distribuição por área/status e projetos enriquecidos.
- `GET /api/activity-logs?userId=...&acao=...&entidade=...&from=YYYY-MM-DD&to=YYYY-MM-DD` — retorna `{ logs }`; disponível para `admin` e `auditor`.

## Administração

- `GET /api/users` — retorna `{ users }`; admin/auditor.
- `PATCH /api/users/:id` — payload `{ "role": "admin|auditor|patrocinador|gerente|participante|visualizador" }`.
- `GET /api/permissions` — retorna `{ matrix }`.
- `PUT /api/permissions` — payload `{ "matrix": [{ "role": "...", "resource": "...", "actions": ["ler"] }] }`.
- `GET /api/settings` — retorna `{ settings }`.
- `PATCH /api/settings` — payload parcial de `PlatformSettings`.

## Códigos comuns

`401` sessão ausente, `403` perfil sem autorização, `404` recurso inexistente, `400` payload inválido e `409` conflito de negócio.

> As implementações atuais usam `lib/store.ts` em memória para demonstração. Em produção, substituir por persistência transacional e manter o mesmo contrato HTTP.
