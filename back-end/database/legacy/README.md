# SQL legado

Os arquivos desta pasta foram consolidados fisicamente em:

```text
../0001_aurora_consolidated.sql
```

Não execute estes arquivos em conjunto com a migration consolidada. Eles existem apenas para rastreabilidade histórica e comparação durante auditorias.

Para uma instalação manual no PostgreSQL Aurora, execute apenas:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f back-end/database/0001_aurora_consolidated.sql
```

A migration consolidada controla uma única transação e registra a versão `0001_aurora_consolidated` em `schema_migrations`.
