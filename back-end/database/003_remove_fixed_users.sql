BEGIN;

-- Remove usuários criados apenas como demonstração/seed local.
-- O login corporativo passa a provisionar/atualizar o usuário a partir do CAv4.
CREATE TEMP TABLE fixed_users_to_remove (email varchar(320) PRIMARY KEY) ON COMMIT DROP;
INSERT INTO fixed_users_to_remove (email) VALUES
    ('kleber.goncalves.prestserv@petrobras.com.br'),
    ('fabio.j.lima.prestserv@petrobras.com.br'),
    ('jefferson.breno.prestserv@petrobras.com.br'),
    ('raisa.moreira.prestserv@petrobras.com.br'),
    ('wagner.brazil@petrobras.com.br'),
    ('jose.balouta.prestserv@petrobras.com.br'),
    ('jairo.farias@petrobras.com.br'),
    ('fabio_carvalho.prestserv@petrobras.com.br')
ON CONFLICT DO NOTHING;

CREATE TEMP TABLE fixed_user_ids ON COMMIT DROP AS
SELECT u.id
FROM users u
JOIN fixed_users_to_remove f ON lower(u.email) = lower(f.email);

DELETE FROM sessions WHERE user_id IN (SELECT id FROM fixed_user_ids);
DELETE FROM project_members WHERE user_id IN (SELECT id FROM fixed_user_ids);
DELETE FROM access_requests WHERE requester_id IN (SELECT id FROM fixed_user_ids);
DELETE FROM activity_logs WHERE user_id IN (SELECT id FROM fixed_user_ids);
DELETE FROM folders WHERE created_by IN (SELECT id FROM fixed_user_ids);

DELETE FROM users WHERE id IN (SELECT id FROM fixed_user_ids);

COMMIT;

-- Validação: deve retornar zero linhas para as contas fixas removidas.
SELECT u.id, u.email, u.name
FROM users u
JOIN fixed_users_to_remove f ON lower(u.email) = lower(f.email);
