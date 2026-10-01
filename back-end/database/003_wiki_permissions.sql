-- Permissão de acesso à Wiki de ajuda.
-- O perfil Mixer é tratado como Administrador pela aplicação e não exige um novo perfil.
\set ON_ERROR_STOP on
BEGIN;

INSERT INTO modules (id, name, route, icon, display_order, active)
VALUES ('wiki', 'Wiki de Ajuda', '', 'book-open', 90, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, active = true;

INSERT INTO permissions (id, module_id, name, description, active)
VALUES ('wiki.visualizar', 'wiki', 'Visualizar Wiki', 'Consultar os guias de ajuda disponíveis para o perfil.', true)
ON CONFLICT (id) DO UPDATE SET module_id = EXCLUDED.module_id, name = EXCLUDED.name, description = EXCLUDED.description, active = true;

INSERT INTO profile_modules (profile_id, module_id, can_view)
SELECT id, 'wiki', true FROM profiles WHERE id = 'ADM'
ON CONFLICT (profile_id, module_id) DO UPDATE SET can_view = true;

INSERT INTO profile_permissions (profile_id, permission_id, allowed)
SELECT id, 'wiki.visualizar', true FROM profiles WHERE id = 'ADM'
ON CONFLICT (profile_id, permission_id) DO UPDATE SET allowed = true;

COMMIT;

INSERT INTO schema_migrations (version)
VALUES ('003_wiki_permissions')
ON CONFLICT (version) DO NOTHING;
