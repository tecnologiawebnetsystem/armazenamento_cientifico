# Arquitetura do backend

O backend segue uma organização modular baseada em camadas:

- `app/main.py`: composição e ciclo de vida da aplicação.
- `app/core/`: configurações e componentes transversais.
- `app/db/`: pool e acesso ao PostgreSQL.
- `app/api/`: dependências HTTP e routers por domínio.
- `app/schemas/`: contratos Pydantic de entrada e saída.
- `app/services/`: regras de negócio e transações.
- `app/repositories/`: consultas persistentes isoladas.
- `tests/`: testes unitários, contratos OpenAPI e integração PostgreSQL.

Durante a migração, `app/legacy_api.py` mantém os endpoints já consumidos pelo frontend. O entrypoint `main.py` continua expondo `app`, garantindo compatibilidade com `uvicorn main:app` e com as API Routes de fallback do Next.js. Novos domínios devem ser adicionados como `router.py`, `service.py`, `repository.py` e `schemas.py`, evitando lógica SQL diretamente nos handlers.

## Execução

```bash
uv sync --group dev
uv run uvicorn main:app --reload --port 8000
```

Documentação interativa: `/docs`, `/redoc` e `/openapi.json`.
