BEGIN;

UPDATE projects
SET parent_folder = '\\dfs.petrobras.biz\cientifico\cenpes\gp',
    updated_at = NOW()
WHERE id = 'e70c78de48fa6033f55a39ae5cf02f80'
  AND name = 'Gestão Financeira e Zoneamento 3 - Projeto 01';

UPDATE projects
SET parent_folder = '\\dfs.petrobras.biz\cientifico\cenpes\hpc',
    updated_at = NOW()
WHERE id = 'b8d840755dc051bdb4001f348c6ce4fc'
  AND name = 'Gestão de Controle e Tecnologia Logística - Projeto 01';

-- Confirma os registros atualizados antes do commit.
SELECT id, name, parent_folder
FROM projects
WHERE id IN (
  'e70c78de48fa6033f55a39ae5cf02f80',
  'b8d840755dc051bdb4001f348c6ce4fc'
);

COMMIT;

-- Validação final.
SELECT id, name, parent_folder
FROM projects
WHERE id IN (
  'e70c78de48fa6033f55a39ae5cf02f80',
  'b8d840755dc051bdb4001f348c6ce4fc'
)
ORDER BY name;
