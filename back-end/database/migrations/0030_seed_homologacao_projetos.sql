-- SIGAC | Massa de homologação de projetos e acessos
-- Cria 60 projetos distribuídos em 10 áreas, gestores e participantes.
-- Idempotente: pode ser executado novamente sem duplicar projetos, membros ou pastas.
-- Destinado exclusivamente a homologação/desenvolvimento. Não executar em produção.

BEGIN;

DO $$
DECLARE
    v_area TEXT;
    v_prefix TEXT;
    v_manager TEXT;
    v_user TEXT;
    v_project_id TEXT;
    v_folder_id TEXT;
    v_project_number INTEGER;
    v_project_name TEXT;
    v_status TEXT;
    v_area_index INTEGER;
    v_project_index INTEGER;
    v_manager_index INTEGER;
    v_created_at TIMESTAMP := CURRENT_TIMESTAMP;
    areas TEXT[][] := ARRAY[
        ['tecnologia-informacao','TI'], ['governanca-compliance','GC'],
        ['gestao-documental','GD'], ['pesquisa-desenvolvimento','PD'],
        ['engenharia','ENG'], ['pesquisa','PES'], ['operacoes','OP'],
        ['documentacao','DOC'], ['tecnologia','TEC'], ['seguranca-informacao','SI']
    ];
    managers TEXT[] := ARRAY[
        'seed-admin-kleber','seed-admin-fabio-junior','seed-admin-jefferson',
        'seed-admin-raisa','seed-admin-wagner','seed-admin-jose',
        'seed-admin-jairo','seed-admin-fabio-carvalho'
    ];
    participants TEXT[] := ARRAY[
        'seed-admin-kleber','seed-admin-fabio-junior','seed-admin-jefferson',
        'seed-admin-raisa','seed-admin-wagner','seed-admin-jose',
        'seed-admin-jairo','seed-admin-fabio-carvalho'
    ];
BEGIN
    -- Garante a décima área usada pela massa.
    INSERT INTO responsible_areas (id, name, prefix, next_number, active, created_at, updated_at)
    VALUES ('seguranca-informacao','Segurança da Informação','SI',1,TRUE,v_created_at,v_created_at)
    ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, prefix=EXCLUDED.prefix, active=TRUE, updated_at=v_created_at;

    FOR v_area_index IN 1..array_length(areas, 1) LOOP
        v_area := areas[v_area_index][1];
        v_prefix := areas[v_area_index][2];
        FOR v_project_index IN 1..6 LOOP
            v_project_number := ((v_area_index - 1) * 6) + v_project_index;
            v_project_id := format('hom-proj-%s-%s', lpad(v_area_index::TEXT, 2, '0'), lpad(v_project_index::TEXT, 2, '0'));
            v_project_name := format('Projeto Homologação %s %s', v_prefix, lpad(v_project_index::TEXT, 2, '0'));
            v_manager_index := ((v_project_number - 1) % array_length(managers, 1)) + 1;
            v_manager := managers[v_manager_index];
            v_status := CASE WHEN v_project_number % 11 = 0 THEN 'suspenso' WHEN v_project_number % 7 = 0 THEN 'concluido' ELSE 'ativo' END;

            INSERT INTO projects (
                id, name, code, responsible_area, managers_ids, write_group, read_group,
                write_identity_role, read_identity_role, snow_task_number, parent_folder,
                description, status, participants_ids, created_at, updated_at
            ) VALUES (
                v_project_id, v_project_name, format('%s-%s', v_prefix, lpad(v_project_index::TEXT, 3, '0')),
                v_area, jsonb_build_array(v_manager), format('SIGAC_%s_GESTAO', upper(v_prefix)),
                format('SIGAC_%s_LEITURA', upper(v_prefix)), 'gestor', 'visualizador',
                format('HML-%s-%s', v_prefix, lpad(v_project_index::TEXT, 3, '0')),
                format('/homologacao/%s/%s', v_area, v_project_id),
                format('Projeto de homologação %s da área %s, com dados sintéticos para validação de acesso.', lpad(v_project_index::TEXT, 2, '0'), v_area),
                v_status, to_jsonb(participants), v_created_at, v_created_at
            ) ON CONFLICT (id) DO UPDATE SET
                name=EXCLUDED.name, responsible_area=EXCLUDED.responsible_area,
                managers_ids=EXCLUDED.managers_ids, status=EXCLUDED.status,
                participants_ids=EXCLUDED.participants_ids, updated_at=v_created_at;

            INSERT INTO project_members (project_id, user_id, role, created_at)
            VALUES (v_project_id, v_manager, 'gestor', v_created_at)
            ON CONFLICT (project_id, user_id) DO UPDATE SET role=EXCLUDED.role;

            FOREACH v_user IN ARRAY participants LOOP
                IF v_user <> v_manager THEN
                    INSERT INTO project_members (project_id, user_id, role, created_at)
                    VALUES (v_project_id, v_user, CASE WHEN v_user = participants[((v_project_number) % array_length(participants, 1)) + 1] THEN 'auditor' ELSE 'participante' END, v_created_at)
                    ON CONFLICT (project_id, user_id) DO UPDATE SET role=EXCLUDED.role;
                END IF;
            END LOOP;

            v_folder_id := format('hom-folder-%s-root', v_project_id);
            INSERT INTO folders (id, project_id, parent_id, kind, name, size_bytes, mime_type, created_by, created_at, updated_at)
            VALUES (v_folder_id, v_project_id, NULL, 'folder', 'Documentos do projeto', 0, NULL, v_manager, v_created_at, v_created_at)
            ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, updated_at=v_created_at;

            INSERT INTO folders (id, project_id, parent_id, kind, name, size_bytes, mime_type, created_by, created_at, updated_at)
            VALUES
                (format('hom-folder-%s-docs', v_project_id), v_project_id, v_folder_id, 'folder', 'Documentação', 0, NULL, v_manager, v_created_at, v_created_at),
                (format('hom-folder-%s-relatorios', v_project_id), v_project_id, v_folder_id, 'folder', 'Relatórios', 0, NULL, v_manager, v_created_at, v_created_at),
                (format('hom-folder-%s-restrito', v_project_id), v_project_id, v_folder_id, 'folder', 'Área restrita', 0, NULL, v_manager, v_created_at, v_created_at)
            ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, parent_id=EXCLUDED.parent_id, updated_at=v_created_at;
        END LOOP;
    END LOOP;
END $$;

-- Solicitações e auditoria para validar fluxos relacionados.
INSERT INTO access_requests (id, project_id, requester_id, status, request_type, requested_role, justification, servicenow_ticket, updated_at, analyzed_by, created_at)
SELECT format('hom-request-%s', p.id), p.id, 'seed-admin-fabio-junior',
       CASE WHEN row_number() OVER (ORDER BY p.code) % 4 = 0 THEN 'pendente' WHEN row_number() OVER (ORDER BY p.code) % 4 = 1 THEN 'aprovado' ELSE 'em_analise' END,
       'projeto', 'participante', 'Solicitação sintética para homologação de acesso.',
       format('HML-%s', p.code), CURRENT_TIMESTAMP,
       CASE WHEN row_number() OVER (ORDER BY p.code) % 4 = 1 THEN 'seed-admin-kleber' ELSE NULL END,
       CURRENT_TIMESTAMP
FROM projects p
WHERE p.id LIKE 'hom-proj-%'
ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, updated_at=CURRENT_TIMESTAMP, analyzed_by=EXCLUDED.analyzed_by;

INSERT INTO activity_logs (id, user_id, action, entity, entity_id, details, result, project_id, created_at)
SELECT format('hom-log-%s', p.id), 'seed-admin-kleber', 'homologacao.consulta', 'project', p.id,
       'Registro sintético criado pela massa de homologação.', 'success', p.id, CURRENT_TIMESTAMP
FROM projects p
WHERE p.id LIKE 'hom-proj-%'
ON CONFLICT (id) DO UPDATE SET details=EXCLUDED.details, created_at=CURRENT_TIMESTAMP;

-- Atualiza contadores das áreas após a carga.
UPDATE responsible_areas ra
SET next_number = 7, updated_at = CURRENT_TIMESTAMP
WHERE ra.id IN ('tecnologia-informacao','governanca-compliance','gestao-documental','pesquisa-desenvolvimento','engenharia','pesquisa','operacoes','documentacao','tecnologia','seguranca-informacao');

COMMIT;

-- ============================================================
-- Consultas de homologação: projetos, pastas e acesso efetivo
-- ============================================================

-- 1. Resumo: 60 projetos distribuídos por área e status.
SELECT responsible_area, status, COUNT(*) AS total_projetos
FROM projects
WHERE id LIKE 'hom-proj-%'
GROUP BY responsible_area, status
ORDER BY responsible_area, status;

-- 2. Todos os projetos e seus gestores persistidos em project_members.
SELECT p.code, p.name AS projeto, p.responsible_area, p.status,
       u.name AS gestor, u.email AS gestor_email
FROM projects p
JOIN project_members pm ON pm.project_id = p.id AND pm.role = 'gestor'
JOIN users u ON u.id = pm.user_id
WHERE p.id LIKE 'hom-proj-%'
ORDER BY p.responsible_area, p.code;

-- 3. Pastas de cada projeto, incluindo hierarquia.
SELECT p.code, p.name AS projeto, f.id AS pasta_id, pf.name AS pasta_pai,
       f.name AS pasta, f.kind, f.created_at
FROM folders f
JOIN projects p ON p.id = f.project_id
LEFT JOIN folders pf ON pf.id = f.parent_id
WHERE p.id LIKE 'hom-proj-%'
ORDER BY p.code, f.parent_id NULLS FIRST, f.name;

-- 4. Usuários com acesso a cada projeto, usando project_members.
SELECT p.code, p.name AS projeto, p.responsible_area,
       u.name AS usuario, u.email, pm.role AS acesso_projeto,
       pr.name AS perfil_sigac
FROM project_members pm
JOIN projects p ON p.id = pm.project_id
JOIN users u ON u.id = pm.user_id
LEFT JOIN profiles pr ON pr.id = u.profile_id
WHERE p.id LIKE 'hom-proj-%'
ORDER BY p.code, pm.role, u.name;

-- 5. Usuários que podem acessar cada pasta/projeto pela associação do projeto.
-- A tabela folders não possui ACL própria; o acesso é herdado de project_members.
SELECT p.code, p.name AS projeto, f.name AS pasta,
       u.name AS usuario, u.email, pm.role AS acesso_herdado,
       CASE WHEN pm.role IN ('gestor','auditor') THEN 'escrita/auditoria' ELSE 'leitura' END AS nivel_estimado
FROM folders f
JOIN projects p ON p.id = f.project_id
JOIN project_members pm ON pm.project_id = p.id
JOIN users u ON u.id = pm.user_id
WHERE p.id LIKE 'hom-proj-%'
ORDER BY p.code, f.name, u.name;

-- 6. Matriz de validação: projeto, pasta, usuário e permissões de perfil.
SELECT p.code, f.name AS pasta, u.email, pr.name AS perfil,
       COALESCE(string_agg(DISTINCT perm.id, ', ' ORDER BY perm.id) FILTER (WHERE pp.allowed AND perm.active), 'sem permissões') AS permissoes
FROM folders f
JOIN projects p ON p.id = f.project_id
JOIN project_members pm ON pm.project_id = p.id
JOIN users u ON u.id = pm.user_id
LEFT JOIN profiles pr ON pr.id = u.profile_id
LEFT JOIN profile_permissions pp ON pp.profile_id = pr.id
LEFT JOIN permissions perm ON perm.id = pp.permission_id
WHERE p.id LIKE 'hom-proj-%'
GROUP BY p.code, f.name, u.email, pr.name
ORDER BY p.code, f.name, u.email;

-- 7. Contagens esperadas para homologação.
SELECT
    (SELECT COUNT(*) FROM projects WHERE id LIKE 'hom-proj-%') AS projetos_esperados_60,
    (SELECT COUNT(*) FROM folders WHERE id LIKE 'hom-folder-%') AS pastas_esperadas_240,
    (SELECT COUNT(*) FROM project_members pm JOIN projects p ON p.id=pm.project_id WHERE p.id LIKE 'hom-proj-%') AS vinculos_projeto,
    (SELECT COUNT(DISTINCT responsible_area) FROM projects WHERE id LIKE 'hom-proj-%') AS areas_esperadas_10;

-- Para remover somente a massa de homologação, execute em transação:
-- BEGIN;
-- DELETE FROM projects WHERE id LIKE 'hom-proj-%';
-- COMMIT;
