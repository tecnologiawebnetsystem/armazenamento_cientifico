# SID Deploy — Homologação e Produção

O deploy automatizado do banco deve ser executado pelo entrypoint:

```bash
./back-end/database/SID_DEPLOY.sh
```

O ambiente de execução deve fornecer `DATABASE_URL` por secret/variável protegida. Nenhuma credencial deve ser gravada no repositório.

## Etapas automáticas

1. Executa `uv run alembic upgrade head` para criar ou atualizar a estrutura.
2. Executa `0001_aurora_consolidated.sql` dentro de uma transação PostgreSQL.
3. Aplica perfis, módulos, permissões, `profile_modules`, `profile_permissions`, menus e `menu_permissions` de forma idempotente.
4. Valida a versão atual do Alembic e a existência das tabelas principais.

O mesmo script pode ser usado em banco novo, homologação e produção. Em produção, o pipeline deve exigir backup/aprovação antes desta etapa. O script não apaga dados transacionais e não contém credenciais.

## Configuração do pipeline

O job de deploy deve:

```bash
cd back-end
uv sync --frozen
../back-end/database/SID_DEPLOY.sh
```

Para bancos existentes com histórico Alembic antigo, o DBA deve alinhar a versão registrada em `alembic_version` antes de executar o deploy, conforme a compatibilidade do schema.
