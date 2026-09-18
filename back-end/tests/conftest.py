"""Configuração mínima para testes sem introduzir um backend SQLite."""

import os

# Os testes de contrato importam a aplicação durante a coleta. Um DSN PostgreSQL
# sintaticamente válido mantém a configuração fiel ao runtime; o probe real pode
# retornar 503 quando não existe Aurora disponível no ambiente de testes.
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://test:test@127.0.0.1:5432/sigac_test",
)
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("EXPOSE_API_DOCS", "true")
