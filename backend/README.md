# Armazenamento Científico — Backend

API REST em FastAPI 0.115+ com PostgreSQL/Neon e documentação OpenAPI.

## Execução

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Configure `DATABASE_URL` usando `.env.example`. A aplicação não usa dados em memória: usuários, sessões, projetos, arquivos, compartilhamentos, permissões, settings e auditoria são persistidos no PostgreSQL.

## Documentação

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI: `http://localhost:8000/openapi.json`
- Health: `http://localhost:8000/health`

## Rotas

- Auth: login, logout e sessão
- Projetos: CRUD e membros
- Arquivos: CRUD, pastas e compartilhamentos
- Relatórios e mapa de acesso
- Auditoria e exportação CSV/TXT
- Administração de usuários, permissões e configurações

Todas as rotas, exceto login e health, exigem o cookie de sessão. O endpoint de login valida o usuário persistido; as senhas devem ser armazenadas como hash no banco.

## Segurança

A API aplica autorização por perfil e escopo de projeto, queries parametrizadas, cookies HttpOnly, CORS configurável e constraints PostgreSQL. Em produção, defina `COOKIE_SECURE=true`, use HTTPS e limite `CORS_ORIGINS` aos domínios oficiais.
