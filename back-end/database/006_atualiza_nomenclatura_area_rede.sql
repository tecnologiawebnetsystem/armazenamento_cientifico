\set ON_ERROR_STOP on
BEGIN;

-- Atualiza somente textos exibidos no front-end.
-- IDs, rotas, códigos e nomes técnicos são preservados para não quebrar integrações.

-- Módulo e menu principal
UPDATE modules
SET name = 'Área de Rede'
WHERE id = 'projetos';

UPDATE menus
SET name = 'Área de Rede'
WHERE id = 'menu-projetos';

-- Permissões exibidas no cadastro de acessos
UPDATE permissions
SET name = CASE id
    WHEN 'projeto.visualizar' THEN 'Visualizar área de rede'
    WHEN 'projeto.criar' THEN 'Criar área de rede'
    WHEN 'projeto.editar' THEN 'Editar área de rede'
    WHEN 'projeto.status' THEN 'Alterar status da área de rede'
    WHEN 'projeto.excluir' THEN 'Excluir área de rede'
    ELSE name
  END,
  description = CASE id
    WHEN 'projeto.visualizar' THEN 'Visualizar áreas de rede'
    WHEN 'projeto.criar' THEN 'Criar área de rede'
    WHEN 'projeto.editar' THEN 'Editar área de rede'
    WHEN 'projeto.status' THEN 'Alterar status de áreas de rede'
    WHEN 'projeto.excluir' THEN 'Excluir áreas de rede'
    ELSE description
  END
WHERE id IN (
  'projeto.visualizar',
  'projeto.criar',
  'projeto.editar',
  'projeto.status',
  'projeto.excluir'
);

-- Status e descrições relacionadas
UPDATE report_types
SET name = 'Relatório Executivo de Áreas de Rede',
    description = 'Portfólio, status, áreas, gestores e indicadores das áreas de rede.'
WHERE code = 'projetos';

UPDATE report_fields
SET label = CASE id
    WHEN 'projetos-nome' THEN 'Área de Rede'
    WHEN 'acessos-projeto-id' THEN 'Identificador da área de rede'
    WHEN 'acessos-projeto' THEN 'Área de Rede'
    WHEN 'acessos-status' THEN 'Status da área de rede'
    ELSE label
  END
WHERE id IN (
  'projetos-nome',
  'acessos-projeto-id',
  'acessos-projeto',
  'acessos-status'
);

-- Campos de auditoria e mapa de acessos que ainda usam o texto antigo
UPDATE report_fields
SET label = replace(replace(label, 'projetos', 'áreas de rede'), 'Projeto', 'Área de Rede')
WHERE label ILIKE '%projeto%';

COMMIT;

-- Validação opcional após a execução:
-- SELECT id, name, route FROM modules WHERE id = 'projetos';
-- SELECT id, name, description FROM permissions WHERE id LIKE 'projeto.%' ORDER BY id;
-- SELECT id, name, route FROM menus WHERE id = 'menu-projetos';
-- SELECT id, code, name FROM report_types WHERE code = 'projetos';
-- SELECT id, label FROM report_fields WHERE label ILIKE '%projeto%' OR label ILIKE '%área de rede%';
