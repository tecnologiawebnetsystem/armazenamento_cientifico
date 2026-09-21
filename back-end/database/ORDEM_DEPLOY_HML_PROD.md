# Ordem de execução — Homologação e Produção

O banco de Desenvolvimento não faz parte deste procedimento.

## 1. Backup

Executar backup completo do banco alvo e confirmar o schema PostgreSQL utilizado pela aplicação.

## 2. Migration consolidada

Na pasta `back-end`, executar:

```bash
alembic upgrade 0001_production_baseline
```

Essa é a única migration ativa. As revisions anteriores ficam em `alembic/legacy_versions/` apenas para histórico.

## 3. Seed idempotente

Após a migration, executar o bootstrap/seed da aplicação conforme o entrypoint operacional do ambiente. O seed deve preencher parâmetros sem recriar ou apagar dados transacionais.

## 4. Validação

Confirmar:

- `alembic current` aponta para `0001_production_baseline`;
- tabelas de perfis, módulos, permissões, menus, cards e relatórios existem;
- o seed não gerou duplicidades;
- login por e-mail e CAV4 permanecem disponíveis;
- endpoints de contexto da plataforma retornam menus e permissões;
- nenhum arquivo de `legacy_versions` foi incluído no comando de migration.

## Observação sobre banco já existente

Se Homologação ou Produção já possuírem a tabela `alembic_version` com o histórico antigo, não executar a baseline diretamente sem alinhar o versionamento. O DBA deve registrar o banco como `0001_production_baseline` somente após confirmar que o schema existente corresponde ao metadata ORM final.
