-- SIGAC - permissões completas do administrador
-- Concede ao perfil ADM acesso a todos os módulos, permissões e menus ativos.
-- Script idempotente: pode ser executado novamente sem duplicar registros.

BEGIN;

-- O administrador pode visualizar todos os módulos ativos.
INSERT INTO profile_modules (profile_id, module_id, can_view)
SELECT 'ADM', m.id, TRUE
FROM modules m
WHERE m.active = TRUE
  AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = 'ADM')
ON CONFLICT (profile_id, module_id)
DO UPDATE SET can_view = EXCLUDED.can_view;

-- O administrador possui todas as permissões ativas.
INSERT INTO profile_permissions (profile_id, permission_id, allowed)
SELECT 'ADM', p.id, TRUE
FROM permissions p
WHERE p.active = TRUE
  AND EXISTS (SELECT 1 FROM profiles profile WHERE profile.id = 'ADM')
ON CONFLICT (profile_id, permission_id)
DO UPDATE SET allowed = EXCLUDED.allowed;

-- Cada menu ativo fica liberado para cada permissão ativa.
-- A aplicação poderá exibir o menu ao administrador por qualquer permissão concedida.
INSERT INTO menu_permissions (menu_id, permission_id, allowed)
SELECT m.id, p.id, TRUE
FROM menus m
CROSS JOIN permissions p
WHERE m.active = TRUE
  AND p.active = TRUE
  AND EXISTS (SELECT 1 FROM profiles profile WHERE profile.id = 'ADM')
ON CONFLICT (menu_id, permission_id)
DO UPDATE SET allowed = EXCLUDED.allowed;

COMMIT;

-- Validação rápida após a execução:
-- SELECT COUNT(*) AS modulos_admin
-- FROM profile_modules
-- WHERE profile_id = 'ADM' AND can_view = TRUE;
--
-- SELECT COUNT(*) AS permissoes_admin
-- FROM profile_permissions
-- WHERE profile_id = 'ADM' AND allowed = TRUE;
--
-- SELECT COUNT(*) AS permissoes_de_menu
-- FROM menu_permissions
-- WHERE allowed = TRUE;
--
-- SELECT m.name AS menu, COUNT(mp.permission_id) AS permissoes
-- FROM menus m
-- LEFT JOIN menu_permissions mp ON mp.menu_id = m.id AND mp.allowed = TRUE
-- WHERE m.active = TRUE
-- GROUP BY m.id, m.name
-- ORDER BY m.display_order, m.name;
