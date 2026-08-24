# Backend FastAPI

Backend Python compatível com os contratos usados pelo frontend atual. O frontend não foi alterado: ele continua chamando `/api/...` e pode apontar `NEXT_PUBLIC_API_BASE_URL` para este serviço.

## Executar localmente

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Documentação interativa: `http://localhost:8000/docs`
Verificação: `GET /health`

## Sessão e desenvolvimento

Para desenvolvimento, o login cria o cookie `wayon_session_user_id`. Também é possível simular um usuário com o header `x-user-id`. Os usuários de demonstração são `admin@exemplo.com`, `gerente@exemplo.com`, `patrocinador@exemplo.com` e `auditor@exemplo.com`; as senhas de demonstração são os nomes dos perfis seguidos de `123`.

## Contratos

Os paths e payloads seguem o cliente existente em `lib/api-client.ts`: autenticação, projetos, membros, arquivos, mapa de acessos, relatórios, auditoria e usuários. A especificação OpenAPI é gerada automaticamente em `/openapi.json`.

> O armazenamento atual é em memória para manter compatibilidade com o protótipo. Antes de produção, substituir os dicionários por PostgreSQL, manter validação Pydantic e aplicar migrações, autenticação real e controles de origem/CORS restritos.
