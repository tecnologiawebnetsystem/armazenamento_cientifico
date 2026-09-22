BEGIN;

-- Remove usuários criados apenas como demonstração/seed local.
-- O login corporativo passa a provisionar/atualizar o usuário a partir do CAv4.
-- Este script não cria tabelas temporárias: o usuário do banco não precisa
-- da permissão CREATE TEMP TABLE.

WITH fixed_users(email) AS (
    VALUES
        ('kleber.goncalves.prestserv@petrobras.com.br'),
        ('fabio.j.lima.prestserv@petrobras.com.br'),
        ('jefferson.breno.prestserv@petrobras.com.br'),
        ('raisa.moreira.prestserv@petrobras.com.br'),
        ('wagner.brazil@petrobras.com.br'),
        ('jose.balouta.prestserv@petrobras.com.br'),
        ('jairo.farias@petrobras.com.br'),
        ('fabio_carvalho.prestserv@petrobras.com.br')
), fixed_user_ids AS (
    SELECT u.id
    FROM users u
    JOIN fixed_users f ON lower(u.email) = lower(f.email)
)
DELETE FROM sessions s
USING fixed_user_ids f
WHERE s.user_id = f.id;

WITH fixed_users(email) AS (
    VALUES
        ('kleber.goncalves.prestserv@petrobras.com.br'),
        ('fabio.j.lima.prestserv@petrobras.com.br'),
        ('jefferson.breno.prestserv@petrobras.com.br'),
        ('raisa.moreira.prestserv@petrobras.com.br'),
        ('wagner.brazil@petrobras.com.br'),
        ('jose.balouta.prestserv@petrobras.com.br'),
        ('jairo.farias@petrobras.com.br'),
        ('fabio_carvalho.prestserv@petrobras.com.br')
), fixed_user_ids AS (
    SELECT u.id
    FROM users u
    JOIN fixed_users f ON lower(u.email) = lower(f.email)
)
DELETE FROM project_members pm USING fixed_user_ids f WHERE pm.user_id = f.id;

WITH fixed_users(email) AS (
    VALUES
        ('kleber.goncalves.prestserv@petrobras.com.br'),
        ('fabio.j.lima.prestserv@petrobras.com.br'),
        ('jefferson.breno.prestserv@petrobras.com.br'),
        ('raisa.moreira.prestserv@petrobras.com.br'),
        ('wagner.brazil@petrobras.com.br'),
        ('jose.balouta.prestserv@petrobras.com.br'),
        ('jairo.farias@petrobras.com.br'),
        ('fabio_carvalho.prestserv@petrobras.com.br')
), fixed_user_ids AS (
    SELECT u.id FROM users u JOIN fixed_users f ON lower(u.email) = lower(f.email)
)
DELETE FROM access_requests ar USING fixed_user_ids f WHERE ar.requester_id = f.id;

WITH fixed_users(email) AS (
    VALUES
        ('kleber.goncalves.prestserv@petrobras.com.br'),
        ('fabio.j.lima.prestserv@petrobras.com.br'),
        ('jefferson.breno.prestserv@petrobras.com.br'),
        ('raisa.moreira.prestserv@petrobras.com.br'),
        ('wagner.brazil@petrobras.com.br'),
        ('jose.balouta.prestserv@petrobras.com.br'),
        ('jairo.farias@petrobras.com.br'),
        ('fabio_carvalho.prestserv@petrobras.com.br')
), fixed_user_ids AS (
    SELECT u.id FROM users u JOIN fixed_users f ON lower(u.email) = lower(f.email)
)
DELETE FROM activity_logs al USING fixed_user_ids f WHERE al.user_id = f.id;

WITH fixed_users(email) AS (
    VALUES
        ('kleber.goncalves.prestserv@petrobras.com.br'),
        ('fabio.j.lima.prestserv@petrobras.com.br'),
        ('jefferson.breno.prestserv@petrobras.com.br'),
        ('raisa.moreira.prestserv@petrobras.com.br'),
        ('wagner.brazil@petrobras.com.br'),
        ('jose.balouta.prestserv@petrobras.com.br'),
        ('jairo.farias@petrobras.com.br'),
        ('fabio_carvalho.prestserv@petrobras.com.br')
), fixed_user_ids AS (
    SELECT u.id FROM users u JOIN fixed_users f ON lower(u.email) = lower(f.email)
)
DELETE FROM folders fo USING fixed_user_ids f WHERE fo.created_by = f.id;

WITH fixed_users(email) AS (
    VALUES
        ('kleber.goncalves.prestserv@petrobras.com.br'),
        ('fabio.j.lima.prestserv@petrobras.com.br'),
        ('jefferson.breno.prestserv@petrobras.com.br'),
        ('raisa.moreira.prestserv@petrobras.com.br'),
        ('wagner.brazil@petrobras.com.br'),
        ('jose.balouta.prestserv@petrobras.com.br'),
        ('jairo.farias@petrobras.com.br'),
        ('fabio_carvalho.prestserv@petrobras.com.br')
), fixed_user_ids AS (
    SELECT u.id FROM users u JOIN fixed_users f ON lower(u.email) = lower(f.email)
)
DELETE FROM users u USING fixed_user_ids f WHERE u.id = f.id;

COMMIT;

-- Validação: deve retornar zero linhas.
SELECT u.id, u.email, u.name
FROM users u
WHERE lower(u.email) IN (
    'kleber.goncalves.prestserv@petrobras.com.br',
    'fabio.j.lima.prestserv@petrobras.com.br',
    'jefferson.breno.prestserv@petrobras.com.br',
    'raisa.moreira.prestserv@petrobras.com.br',
    'wagner.brazil@petrobras.com.br',
    'jose.balouta.prestserv@petrobras.com.br',
    'jairo.farias@petrobras.com.br',
    'fabio_carvalho.prestserv@petrobras.com.br'
);
