# Histórico Alembic legado

Os arquivos desta pasta representam a cadeia utilizada no Desenvolvimento antes da consolidação.

Eles não são carregados pelo Alembic e não devem ser executados em Homologação ou Produção.
Foram preservados somente para rastreabilidade e auditoria.

## Migration oficial

A partir desta consolidação, bancos novos devem executar somente:

```bash
alembic upgrade 0001_production_baseline
```

A revision `0001_production_baseline` cria o schema final a partir do metadata ORM, de forma idempotente (`checkfirst=True`).

A carga de parâmetros e dados iniciais deve ser executada separadamente pelo seed idempotente da aplicação, após a migration.

## Desenvolvimento

O banco de Desenvolvimento já está criado e não deve receber esta baseline novamente. Para Homologação e Produção, aplicar a baseline somente após backup e validação da conexão/schema alvo.
