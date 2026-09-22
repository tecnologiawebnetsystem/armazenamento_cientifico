-- Matriz de acesso oficial do SIGAC.
-- Execute após as migrations de parametrização, em uma transação.
BEGIN;

-- Garante os perfis oficiais sem depender de IDs fixos.
INSERT INTO profiles (id, name, description)
VALUES
  ('ADM', 'Administrador', 'Acesso total'),
  ('GER', 'Gerente', 'Acesso operacional sem configurações e criação de projetos'),
  ('PAT', 'Patrocinador', 'Acesso somente à consulta de projetos'),
  ('AUD', 'Auditor', 'Acesso somente a auditoria e logs')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Remove vínculos de menus para reconstruí-los de forma determinística.
DELETE FROM profile_modules WHERE profile_id IN ('ADM', 'GER', 'PAT', 'AUD');
DELETE FROM profile_permissions WHERE profile_id IN ('ADM', 'GER', 'PAT', 'AUD');

-- Administrador recebe todos os menus e permissões.
INSERT INTO profile_modules (profile_id, module_id, can_view)
SELECT 'ADM', id, true FROM modules ON CONFLICT DO NOTHING;
INSERT INTO profile_permissions (profile_id, permission_id, allowed)
SELECT 'ADM', id, true FROM permissions ON CONFLICT DO NOTHING;

-- Gerente: todos os módulos, exceto Configurações; sem criação de projeto.
INSERT INTO profile_modules (profile_id, module_id, can_view)
SELECT 'GER', m.id, true
FROM modules m
WHERE lower(coalesce(m.route, '')) NOT IN ('/configuracoes', '/configurações')
ON CONFLICT DO NOTHING;
INSERT INTO profile_permissions (profile_id, permission_id, allowed)
SELECT 'GER', p.id, true
FROM permissions p
WHERE lower(coalesce(p.name, p.id::text)) NOT IN ('projeto.criar', 'administracao.configurar', 'administracao.configuracoes')
ON CONFLICT DO NOTHING;

-- Patrocinador: somente o módulo de projetos e leitura de projetos.
INSERT INTO profile_modules (profile_id, module_id, can_view)
SELECT 'PAT', m.id, true FROM modules m
WHERE lower(coalesce(m.route, '')) IN ('/projetos', '/projects')
ON CONFLICT DO NOTHING;
INSERT INTO profile_permissions (profile_id, permission_id, allowed)
SELECT 'PAT', p.id, true FROM permissions p
WHERE lower(coalesce(p.name, p.id::text)) IN ('projeto.visualizar', 'projeto.read', 'read')
ON CONFLICT DO NOTHING;

-- Auditor: somente os módulos de auditoria e logs.
INSERT INTO profile_modules (profile_id, module_id, can_view)
SELECT 'AUD', m.id, true FROM modules m
WHERE lower(coalesce(m.route, '')) LIKE '/auditoria%'
   OR lower(coalesce(m.route, '')) LIKE '/logs%'
ON CONFLICT DO NOTHING;
INSERT INTO profile_permissions (profile_id, permission_id, allowed)
SELECT 'AUD', p.id, true FROM permissions p
WHERE lower(coalesce(p.name, p.id::text)) IN ('auditoria.visualizar', 'logs.visualizar', 'audit')
ON CONFLICT DO NOTHING;

COMMIT;

-- Observação: para o login manual, configure no ambiente do backend:
-- EMAIL_LOGIN_ENABLED=true
-- No frontend, use NEXT_PUBLIC_EMAIL_LOGIN_ENABLED=true.
-- Aliases legados também são aceitos pelo código: EMAIL_LOGIN_ENABLE,
-- NEXT_PUBLIC_EMAIL_LOGIN_ENABLE, NEST_PUBLIC_EMAIL_LOGIN_ENABLED e NEST_PUBLIC_EMAIL_LOGIN_ENABLE.
