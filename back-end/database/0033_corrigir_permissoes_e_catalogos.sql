-- SIGAC: correção de consistência entre perfis, módulos, menus e dashboard.
-- Execute no mesmo banco/schema utilizado pelo backend.
-- Script idempotente e seguro para execução repetida.

BEGIN;

-- Garante que a tabela usada pelo backend para filtrar menus exista.
CREATE TABLE IF NOT EXISTS menu_permissions (
    menu_id VARCHAR(80) NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    permission_id VARCHAR(80) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    allowed BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (menu_id, permission_id)
);

-- O dashboard filtra por profile_id. Os registros antigos usavam nomes de
-- perfil (admin, gerente...), por isso alguns cards não apareciam para ADM.
UPDATE dashboard_cards
SET profile_ids = CASE key
    WHEN 'dashboard-projetos' THEN 'ADM,GER,PAT,AUD'
    WHEN 'dashboard-pendencias' THEN 'ADM,GER'
    WHEN 'dashboard-auditoria' THEN 'ADM,AUD'
    ELSE profile_ids
END
WHERE key IN ('dashboard-projetos', 'dashboard-pendencias', 'dashboard-auditoria');

-- O administrador visualiza todos os módulos ativos.
INSERT INTO profile_modules (profile_id, module_id, can_view)
SELECT 'ADM', m.id, TRUE
FROM profiles p
CROSS JOIN modules m
WHERE p.id = 'ADM' AND m.active = TRUE
ON CONFLICT (profile_id, module_id)
DO UPDATE SET can_view = EXCLUDED.can_view;

-- O administrador possui todas as permissões ativas.
INSERT INTO profile_permissions (profile_id, permission_id, allowed)
SELECT 'ADM', permission.id, TRUE
FROM profiles profile
CROSS JOIN permissions permission
WHERE profile.id = 'ADM' AND permission.active = TRUE
ON CONFLICT (profile_id, permission_id)
DO UPDATE SET allowed = EXCLUDED.allowed;

-- Todo menu ativo fica acessível ao administrador por uma permissão ativa.
INSERT INTO menu_permissions (menu_id, permission_id, allowed)
SELECT menu.id, permission.id, TRUE
FROM profiles profile
CROSS JOIN menus menu
CROSS JOIN permissions permission
WHERE profile.id = 'ADM'
  AND menu.active = TRUE
  AND permission.active = TRUE
ON CONFLICT (menu_id, permission_id)
DO UPDATE SET allowed = EXCLUDED.allowed;

-- Validação mínima: cada menu ativo deve ter ao menos uma permissão ativa.
-- Menus sem vínculo continuam visíveis pelo fallback do backend, mas o vínculo
-- explícito evita divergência entre telas e regras de autorização.

COMMIT;

-- Consultas de conferência:
-- SELECT id, name, profile_ids FROM dashboard_cards ORDER BY display_order;
-- SELECT COUNT(*) AS modulos_admin FROM profile_modules WHERE profile_id='ADM' AND can_view;
-- SELECT COUNT(*) AS permissoes_admin FROM profile_permissions WHERE profile_id='ADM' AND allowed;
-- SELECT m.id, m.name, COUNT(mp.permission_id) AS permissoes
-- FROM menus m
-- LEFT JOIN menu_permissions mp ON mp.menu_id=m.id AND mp.allowed
-- WHERE m.active
-- GROUP BY m.id, m.name
-- ORDER BY m.display_order, m.name;
-- SELECT u.email, u.profile_id, p.name AS profile_name
-- FROM users u LEFT JOIN profiles p ON p.id=u.profile_id
-- WHERE u.role='administrador' OR u.profile_id='ADM';

-- Observação: o seed Python ainda declara menu-usuarios, enquanto o script
-- 0031 o remove. Escolha uma única fonte de verdade antes de executar o seed
-- automaticamente; o cadastro dos usuários e permissões continua compatível.
