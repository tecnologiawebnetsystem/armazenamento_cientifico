# API da plataforma

A fonte de verdade do contrato é o OpenAPI gerado em `/openapi.json` (Swagger em `/docs`). Todas as rotas abaixo são expostas pelo backend FastAPI; login e health são as exceções à autenticação por sessão.

## Saúde e autenticação

- `GET /health` — estado da API e configuração do banco.
- `POST /api/auth/login` — payload `{ "email": "...", "senha": "..." }`; retorna `{ "user": ... }` e cria cookie HttpOnly.
- `POST /api/auth/logout` — encerra a sessão; retorna `204`.
- `GET /api/auth/session` — retorna `{ "user": ... }` ou erro de sessão inválida.

## Projetos e membros

- `GET /api/projects` — filtros `status`, `area`, `all`; retorna `{ "projects": [...] }`.
- `POST /api/projects` — cria projeto; retorna `{ "project": ... }`.
- `GET /api/projects/{id}` — retorna `{ "project": ... }`.
- `PATCH /api/projects/{id}` — atualiza campos editáveis; retorna `{ "project": ... }`.
- `DELETE /api/projects/{id}` — remove projeto; retorna `204`.
- `GET /api/projects/{id}/members` — retorna `{ "members": [...] }`.
- `POST` e `PATCH /api/projects/{id}/members` — payload `{ "userId": "...", "papel": "gerente|participante|visualizador" }`.
- `DELETE /api/projects/{id}/members?userId=...` — remove membro.
- `GET /api/projects/layered` — endpoint técnico de transição da arquitetura em camadas, com headers opcionais `X-User-Id` e `X-User-Role`.

## Arquivos e compartilhamento

- `GET /api/files?projectId=...&parentId=...&allFolders=false` — retorna `{ "files": [...], "breadcrumb": [] }`.
- `POST /api/files` — payload `{ projectId, parentId, tipo, nome, tamanho?, mimeType? }`.
- `GET /api/files/{id}` — retorna `{ "file": ... }`.
- `PATCH /api/files/{id}` — payload parcial `{ nome?, parentId? }`.
- `DELETE /api/files/{id}` — remove arquivo ou pasta; retorna `204`.
- `POST /api/files/{id}/share` — payload `{ "userId": "...", "nivel": "leitura|edicao" }`.
- `DELETE /api/files/{id}/share?userId=...` — remove compartilhamento.

## Usuários, auditoria e relatórios

- `GET /api/users` — lista usuários; admin, patrocinador ou auditor.
- `PATCH /api/users/{id}` — altera role; somente admin.
- `GET /api/activity-logs` — filtros `userId`, `acao`, `entidade`, `search`, `from`, `to`; admin ou auditor.
- `GET /api/activity-logs/export?format=csv|txt` — exporta auditoria.
- `GET /api/audit/logs` — endpoint modular de auditoria, conforme o módulo migrado.
- `GET /api/reports` — filtros `status`, `area`, `projectId`, `search`; retorna indicadores e projetos enriquecidos.
- `GET /api/access-map` — mapa de usuários, projetos e recursos acessíveis.

## Administração

- `GET /api/permissions` — retorna a matriz de permissões; admin ou auditor.
- `PUT /api/permissions` — substitui a matriz; somente admin.
- `GET /api/settings` — retorna configurações; admin ou auditor.
- `PATCH /api/settings` — atualiza configurações; somente admin.

## Convenções

Payloads são validados por Pydantic. Erros de negócio devem seguir `{ "error": "Conflict", "message": "...", "details": {} }`; erros de validação usam HTTP `422`. Códigos comuns: `401` sessão ausente, `403` sem permissão, `404` recurso inexistente, `409` conflito.

## Estado da migração

`users`, `projects`, `files` e `audit` já possuem módulos em `backend/app/modules/`. As demais operações ainda são servidas pelo adaptador temporário `backend/app/legacy_api.py`, e aparecem no OpenAPI por composição durante a migração. O endpoint `/api/projects/layered` é apenas um contrato técnico de validação e não deve ser usado pelo frontend como substituto do endpoint principal.
