INSERT INTO modules (id, name, route, icon, display_order, active)
VALUES ('configuracoes', 'Configurações', '/configuracoes', 'settings', 90, true)
ON CONFLICT (id) DO UPDATE SET name = excluded.name, route = excluded.route, icon = excluded.icon, active = excluded.active;

INSERT INTO permissions (id, module_id, name, description, active)
VALUES ('administracao.configuracoes', 'configuracoes', 'Gerenciar configurações', 'Criar, consultar, editar e excluir parâmetros da plataforma', true)
ON CONFLICT (id) DO UPDATE SET module_id = excluded.module_id, name = excluded.name, description = excluded.description, active = excluded.active;

INSERT INTO menus (id, module_id, parent_id, name, route, icon, display_order, active)
VALUES ('menu-configuracoes', 'configuracoes', NULL, 'Configurações', '/configuracoes', 'settings', 90, true)
ON CONFLICT (id) DO UPDATE SET module_id = excluded.module_id, name = excluded.name, route = excluded.route, icon = excluded.icon, active = excluded.active;

INSERT INTO menu_permissions (menu_id, permission_id, allowed)
VALUES ('menu-configuracoes', 'administracao.configuracoes', true)
ON CONFLICT (menu_id, permission_id) DO UPDATE SET allowed = excluded.allowed;

INSERT INTO profile_modules (profile_id, module_id, can_view)
SELECT 'ADM', 'configuracoes', true
WHERE EXISTS (SELECT 1 FROM profiles WHERE id = 'ADM')
ON CONFLICT (profile_id, module_id) DO UPDATE SET can_view = excluded.can_view;

INSERT INTO profile_permissions (profile_id, permission_id, allowed)
SELECT 'ADM', 'administracao.configuracoes', true
WHERE EXISTS (SELECT 1 FROM profiles WHERE id = 'ADM')
ON CONFLICT (profile_id, permission_id) DO UPDATE SET allowed = excluded.allowed;
