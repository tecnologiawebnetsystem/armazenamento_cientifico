-- SIGAC / PostgreSQL Aurora
-- Validações somente leitura. Cada consulta deve retornar zero linhas,
-- exceto os resumos finais de contagem.

-- 1. Permissões apontando para módulo inexistente.
SELECT p.id AS permission_id
FROM permissions p
LEFT JOIN modules m ON m.id = p.module_id
WHERE m.id IS NULL;

-- 2. Menus ativos sem capability vinculada.
SELECT m.id, m.name
FROM menus m
LEFT JOIN menu_permissions mp ON mp.menu_id = m.id AND mp.allowed = true
WHERE m.active = true
GROUP BY m.id, m.name
HAVING COUNT(mp.permission_id) = 0
   AND m.route <> '/dashboard';

-- 3. Relatórios ativos sem campos.
SELECT rt.code, rt.name
FROM report_types rt
LEFT JOIN report_fields rf ON rf.report_code = rt.code AND rf.active = true
WHERE rt.active = true
GROUP BY rt.code, rt.name
HAVING COUNT(rf.id) = 0;

-- 4. Perfis sem módulo visível.
SELECT p.id, p.name
FROM profiles p
LEFT JOIN profile_modules pm ON pm.profile_id = p.id AND pm.can_view = true
GROUP BY p.id, p.name
HAVING COUNT(pm.module_id) = 0;

-- 5. Usuários com perfil inexistente.
SELECT u.email, u.profile_id
FROM users u
LEFT JOIN profiles p ON p.id = u.profile_id
WHERE u.profile_id IS NOT NULL AND p.id IS NULL;

-- 6. Resumo de tabelas de parametrização.
SELECT 'profiles' AS tabela, COUNT(*) AS total FROM profiles
UNION ALL SELECT 'modules', COUNT(*) FROM modules
UNION ALL SELECT 'permissions', COUNT(*) FROM permissions
UNION ALL SELECT 'profile_modules', COUNT(*) FROM profile_modules
UNION ALL SELECT 'profile_permissions', COUNT(*) FROM profile_permissions
UNION ALL SELECT 'menus', COUNT(*) FROM menus
UNION ALL SELECT 'menu_permissions', COUNT(*) FROM menu_permissions
UNION ALL SELECT 'dashboard_cards', COUNT(*) FROM dashboard_cards
UNION ALL SELECT 'report_types', COUNT(*) FROM report_types
UNION ALL SELECT 'report_fields', COUNT(*) FROM report_fields
UNION ALL SELECT 'system_settings', COUNT(*) FROM system_settings
ORDER BY tabela;
