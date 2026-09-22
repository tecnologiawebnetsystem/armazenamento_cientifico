#!/usr/bin/env bash
set -Eeuo pipefail

# SID Deploy — banco novo, homologação e produção.
# Requer DATABASE_URL e executa somente migrations/seed idempotente.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

: "${DATABASE_URL:?DATABASE_URL deve estar configurada no ambiente de deploy}"

export DATABASE_URL

printf '%s\n' '[SID Deploy] Aplicando migration da estrutura...'
uv run alembic upgrade head

printf '%s\n' '[SID Deploy] Aplicando parametrização idempotente...'
psql "$DATABASE_URL" \
  --set ON_ERROR_STOP=1 \
  --single-transaction \
  --file "$ROOT_DIR/database/0001_aurora_consolidated.sql"

printf '%s\n' '[SID Deploy] Validando versão e tabelas principais...'
uv run alembic current
psql "$DATABASE_URL" \
  --set ON_ERROR_STOP=1 \
  --command "SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_name IN ('profiles','modules','permissions','profile_modules','profile_permissions','menus','menu_permissions') ORDER BY table_name;"

printf '%s\n' '[SID Deploy] Concluído com sucesso.'
