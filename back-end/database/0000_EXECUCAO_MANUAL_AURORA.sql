-- SIGAC / PostgreSQL Aurora
-- ORDEM MANUAL DE EXECUÇÃO
-- Executar pelo psql ou DBeaver, conectado ao banco correto.
-- Este arquivo usa comandos \ir do cliente psql. Execute a partir desta pasta:
--   psql "$DATABASE_URL" -f 0000_EXECUCAO_MANUAL_AURORA.sql
-- Não executar junto com outro seed concorrente.
-- Os arquivos são idempotentes; não executar rollback automático em produção.

\set ON_ERROR_STOP on

-- 1. Estrutura canônica, índices e tabelas transacionais.
\ir postgresql-schema.sql

-- 2. Compatibilidade das sessões e subject do CAV4.
\ir migrations/0016_add_cav4_subject_to_sessions.sql
\ir migrations/0020_restore_auth_sessions.sql

-- 3. Parametrização estrutural de menus e cards.
\ir 0023_parametrizacao_completa.sql

-- 4. Carga canônica de perfis, módulos, permissões, menus,
--    menu_permissions, dashboard_cards, report_types, report_fields,
--    profile_modules, profile_permissions e system_settings.
\ir 0040_aurora_parametrizacao_canonica.sql

-- 5. Homologação opcional. Execute somente em ambiente de homologação.
-- \ir migrations/0030_seed_homologacao_projetos.sql

-- 6. Validação final. Este arquivo não altera dados.
\ir 0041_validar_parametrizacao_aurora.sql

-- Scripts legados 0031, 0032, 0033 e 0022 não devem ser executados
-- depois do seed canônico, pois alteram a matriz parametrizada.
