-- SIGAC: corrige os itens principais do menu.
-- Execute no database/schema usados pelo backend.
-- Script idempotente: pode ser executado mais de uma vez.

BEGIN;

-- Remove o item legado de Usuários e suas permissões associadas.
DELETE FROM menu_permissions
WHERE menu_id IN (
    SELECT id
    FROM menus
    WHERE lower(name) IN ('usuários', 'usuarios')
       OR lower(route) IN ('/usuarios', '/users')
);

DELETE FROM menus
WHERE lower(name) IN ('usuários', 'usuarios')
   OR lower(route) IN ('/usuarios', '/users');

-- Insere/atualiza os itens obrigatórios do menu principal.
INSERT INTO menus (id, module_id, parent_id, name, route, icon, display_order, active)
VALUES
    ('menu-dashboard', NULL, NULL, 'Dashboard', '/dashboard', 'dashboard', 10, TRUE),
    ('menu-logs-auditoria', NULL, NULL, 'Logs e Auditoria', '/logs', 'shield', 20, TRUE),
    ('menu-pesquisa', NULL, NULL, 'Pesquisa', '/pesquisas', 'chart', 30, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    route = EXCLUDED.route,
    icon = EXCLUDED.icon,
    display_order = EXCLUDED.display_order,
    active = TRUE;

-- Corrige registros antigos com a mesma rota, evitando duplicidade visual.
UPDATE menus
SET active = FALSE
WHERE id NOT IN ('menu-dashboard', 'menu-logs-auditoria', 'menu-pesquisa')
  AND route IN ('/dashboard', '/logs', '/pesquisas');

COMMIT;

-- Validação opcional:
-- SELECT id, name, route, display_order, active
-- FROM menus
-- WHERE route IN ('/dashboard', '/logs', '/pesquisas', '/usuarios', '/users')
-- ORDER BY display_order, name;
