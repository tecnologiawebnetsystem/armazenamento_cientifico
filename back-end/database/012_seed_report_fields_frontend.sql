-- SIGAC — campos de relatório alinhados ao contrato usado pelo frontend
-- Executar após 0001_aurora_consolidated.sql e 002_seed_operational_catalogs.sql.
-- Idempotente: pode ser executado novamente sem duplicar registros.
\set ON_ERROR_STOP on
BEGIN;

INSERT INTO report_types (id, code, name, description, formats, active)
VALUES
  ('PROJETOS', 'projetos', 'Relatório de projetos', 'Relatório completo dos projetos autorizados', 'csv,xlsx,pdf', true),
  ('ACESSOS', 'acessos', 'Mapa de acessos', 'Usuários, projetos e níveis de acesso', 'csv,xlsx,pdf', true)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  formats = EXCLUDED.formats,
  active = EXCLUDED.active;

INSERT INTO report_fields (id, report_code, field_key, label, source_key, display_order, active)
VALUES
  ('projetos-codigo', 'projetos', 'codigo', 'Código ou identificador', 'codigo', 10, true),
  ('projetos-nome', 'projetos', 'nome', 'Nome do projeto', 'nome', 20, true),
  ('projetos-area-responsavel', 'projetos', 'areaResponsavel', 'Área responsável', 'areaResponsavel', 30, true),
  ('projetos-gestores-ids', 'projetos', 'gestoresIds', 'Gestores do projeto', 'gestoresIds', 40, true),
  ('projetos-grupo-escrita', 'projetos', 'grupoAdEscrita', 'Grupo Azure AD — escrita', 'grupoAdEscrita', 50, true),
  ('projetos-grupo-leitura', 'projetos', 'grupoAdLeitura', 'Grupo Azure AD — leitura', 'grupoAdLeitura', 60, true),
  ('projetos-role-escrita', 'projetos', 'roleIdentidadeEscrita', 'Role Identidade — escrita', 'roleIdentidadeEscrita', 70, true),
  ('projetos-role-leitura', 'projetos', 'roleIdentidadeLeitura', 'Role Identidade — leitura', 'roleIdentidadeLeitura', 80, true),
  ('projetos-tarefa-snow', 'projetos', 'numeroTarefaSnow', 'Número da tarefa do Snow', 'numeroTarefaSnow', 90, true),
  ('projetos-pasta-mae', 'projetos', 'pastaMae', 'Pasta mãe do projeto', 'pastaMae', 100, true),
  ('projetos-descricao', 'projetos', 'descricao', 'Descrição', 'descricao', 110, true),
  ('projetos-status', 'projetos', 'status', 'Status', 'status', 120, true),
  ('projetos-criado-em', 'projetos', 'criadoEm', 'Data de criação', 'criadoEm', 130, true),
  ('projetos-atualizado-em', 'projetos', 'atualizadoEm', 'Data de atualização', 'atualizadoEm', 140, true),
  ('acessos-usuario', 'acessos', 'userName', 'Usuário', 'userName', 10, true),
  ('acessos-chave-cav4', 'acessos', 'userId', 'Chave do usuário CAv4', 'userId', 20, true),
  ('acessos-email', 'acessos', 'userEmail', 'E-mail', 'userEmail', 30, true),
  ('acessos-projeto', 'acessos', 'projectName', 'Projeto', 'projectName', 40, true),
  ('acessos-nivel', 'acessos', 'accessLevel', 'Nível de acesso', 'accessLevel', 50, true)
ON CONFLICT (id) DO UPDATE SET
  report_code = EXCLUDED.report_code,
  field_key = EXCLUDED.field_key,
  label = EXCLUDED.label,
  source_key = EXCLUDED.source_key,
  display_order = EXCLUDED.display_order,
  active = EXCLUDED.active;

-- Desativa somente campos antigos que deixaram de existir no contrato atual.
UPDATE report_fields
SET active = false
WHERE report_code = 'projetos'
  AND field_key NOT IN ('codigo', 'nome', 'areaResponsavel', 'gestoresIds', 'grupoAdEscrita', 'grupoAdLeitura', 'roleIdentidadeEscrita', 'roleIdentidadeLeitura', 'numeroTarefaSnow', 'pastaMae', 'descricao', 'status', 'criadoEm', 'atualizadoEm')
  AND id NOT LIKE 'projetos-%-legado';

COMMIT;
