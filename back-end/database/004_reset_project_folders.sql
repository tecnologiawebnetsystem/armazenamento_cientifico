-- Reset e carga de pastas dos projetos
-- Execute somente após backup. O script remove TODOS os registros de folders.
-- Ajuste o schema se necessário: SET search_path TO a25034;

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM projects) THEN
        RAISE EXCEPTION 'Nenhum projeto encontrado; carga de pastas cancelada';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM users
        WHERE profile_id = 'ADM' OR role = 'administrador'
    ) THEN
        RAISE EXCEPTION 'Nenhum usuário administrador encontrado para created_by';
    END IF;
END $$;

-- A FK folders.created_by é NOT NULL e RESTRICT. Por isso, todas as novas
-- pastas serão criadas com o mesmo administrador técnico existente.
CREATE OR REPLACE FUNCTION pg_temp.seed_project_folders()
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    folder_owner varchar(36);
    project_row record;
    root_id varchar(128);
BEGIN
    SELECT u.id INTO folder_owner
    FROM users u
    WHERE u.profile_id = 'ADM' OR u.role = 'administrador'
    ORDER BY u.created_at NULLS LAST, u.id
    LIMIT 1;

    DELETE FROM folders;

    FOR project_row IN
        SELECT id, code, name
        FROM projects
        ORDER BY code, id
    LOOP
        root_id := md5('sigac-folder:' || project_row.id || ':root');

        INSERT INTO folders (
            id, project_id, parent_id, kind, name, size_bytes,
            mime_type, created_by, created_at, updated_at
        ) VALUES (
            root_id, project_row.id, NULL, 'pasta', 'Documentos', 0,
            NULL, folder_owner, current_timestamp, current_timestamp
        );

        INSERT INTO folders (
            id, project_id, parent_id, kind, name, size_bytes,
            mime_type, created_by, created_at, updated_at
        ) VALUES
        (md5('sigac-folder:' || project_row.id || ':contratos'), project_row.id,
         root_id, 'pasta', 'Contratos', 0, NULL, folder_owner,
         current_timestamp, current_timestamp),
        (md5('sigac-folder:' || project_row.id || ':relatorios'), project_row.id,
         root_id, 'pasta', 'Relatórios', 0, NULL, folder_owner,
         current_timestamp, current_timestamp),
        (md5('sigac-folder:' || project_row.id || ':documentos'), project_row.id,
         root_id, 'pasta', 'Documentos do projeto', 0, NULL, folder_owner,
         current_timestamp, current_timestamp);
    END LOOP;
END;
$function$;

SELECT pg_temp.seed_project_folders();

DROP FUNCTION pg_temp.seed_project_folders();

COMMIT;

-- Conferência final: deve haver quatro pastas por projeto.
SELECT p.code AS projeto, p.name AS nome_projeto, count(f.id) AS quantidade_pastas
FROM projects p
LEFT JOIN folders f ON f.project_id = p.id
GROUP BY p.id, p.code, p.name
ORDER BY p.code, p.name;

SELECT f.id, p.code AS projeto, f.parent_id, f.name, f.created_by
FROM folders f
JOIN projects p ON p.id = f.project_id
ORDER BY p.code, f.parent_id NULLS FIRST, f.name;
