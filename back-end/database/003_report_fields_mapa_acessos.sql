BEGIN;

-- Garante o tipo de relatório usado pelo Mapa de Acessos.
INSERT INTO report_types (id, code, name, description, formats, active)
VALUES ('ACESSOS', 'acessos', 'Mapa de acessos', 'Relatório consolidado de projetos, pastas, grupos, membros e permissões.', 'csv,txt,pdf', TRUE)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  formats = EXCLUDED.formats,
  active = TRUE;

-- Campos específicos do Mapa de Acessos.
INSERT INTO report_fields (id, report_code, field_key, label, source_key, display_order, active)
VALUES
  ('acessos-projeto-codigo', 'acessos', 'projetoCodigo', 'Código do projeto', 'projectCode', 100, TRUE),
  ('acessos-pasta', 'acessos', 'pasta', 'Pasta', 'folderName', 110, TRUE),
  ('acessos-caminho-pasta', 'acessos', 'caminhoPasta', 'Caminho da pasta', 'folderPath', 120, TRUE),
  ('acessos-grupo', 'acessos', 'grupo', 'Grupo de acesso', 'groupName', 130, TRUE),
  ('acessos-permissao', 'acessos', 'permissao', 'Permissão', 'permission', 140, TRUE),
  ('acessos-membro', 'acessos', 'membro', 'Membro', 'memberName', 150, TRUE),
  ('acessos-membro-email', 'acessos', 'membroEmail', 'E-mail do membro', 'memberEmail', 160, TRUE),
  ('acessos-membro-papel', 'acessos', 'membroPapel', 'Papel do membro', 'memberRole', 170, TRUE),
  ('acessos-fonte', 'acessos', 'fonte', 'Fonte da consulta', 'source', 180, TRUE),
  ('acessos-consultado-em', 'acessos', 'consultadoEm', 'Consultado em', 'queriedAt', 190, TRUE)
ON CONFLICT (id) DO UPDATE SET
  report_code = EXCLUDED.report_code,
  field_key = EXCLUDED.field_key,
  label = EXCLUDED.label,
  source_key = EXCLUDED.source_key,
  display_order = EXCLUDED.display_order,
  active = TRUE;

COMMIT;
