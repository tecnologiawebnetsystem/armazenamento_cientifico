-- SIGAC — seed operacional idempotente
-- Executar após 0001_aurora_consolidated.sql / alembic upgrade head.
-- Não insere solicitações de acesso: access_requests é transacional e começa vazia.
\set ON_ERROR_STOP on
BEGIN;

-- Sessões CAv4 não dependem de um registro local em users.
ALTER TABLE sessions ALTER COLUMN user_id DROP NOT NULL;

-- Compatibilidade da tabela transacional com o contrato da API.
-- Bancos antigos podem ter somente project_id/requester_id/status.
ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS request_type varchar(40);
ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS requested_role varchar(40);
ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS justification text;
ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS servicenow_ticket varchar(120);
ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT current_timestamp;
ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS analyzed_by varchar(36) REFERENCES users(id) ON DELETE SET NULL;
UPDATE access_requests SET updated_at = COALESCE(updated_at, created_at);

-- Áreas responsáveis usadas por projetos e geração de códigos.
CREATE TABLE IF NOT EXISTS responsible_areas (
    id varchar(40) PRIMARY KEY,
    name varchar(160) NOT NULL UNIQUE,
    prefix varchar(20) NOT NULL UNIQUE,
    next_number integer NOT NULL DEFAULT 1,
    active boolean NOT NULL DEFAULT true,
    created_at timestamp NOT NULL DEFAULT current_timestamp,
    updated_at timestamp NOT NULL DEFAULT current_timestamp
);

INSERT INTO responsible_areas (id, name, prefix, next_number, active, created_at, updated_at)
VALUES
 ('tecnologia-informacao','Tecnologia da Informação','TI',1,true,current_timestamp,current_timestamp),
 ('governanca-compliance','Governança e Compliance','GC',1,true,current_timestamp,current_timestamp),
 ('gestao-documental','Gestão Documental','GD',1,true,current_timestamp,current_timestamp),
 ('pesquisa-desenvolvimento','Pesquisa e Desenvolvimento','PD',1,true,current_timestamp,current_timestamp),
 ('engenharia','Engenharia','ENG',1,true,current_timestamp,current_timestamp),
 ('pesquisa','Pesquisa','PES',1,true,current_timestamp,current_timestamp),
 ('operacoes','Operações','OP',1,true,current_timestamp,current_timestamp),
 ('documentacao','Documentação','DOC',1,true,current_timestamp,current_timestamp),
 ('tecnologia','Tecnologia','TEC',1,true,current_timestamp,current_timestamp)
ON CONFLICT (id) DO UPDATE SET
 name=excluded.name, prefix=excluded.prefix, active=excluded.active, updated_at=current_timestamp;

-- Tipos de relatório e campos válidos para cada tipo.
INSERT INTO report_types (id, code, name, description, formats, active)
VALUES
 ('PROJETOS','projetos','Relatório de projetos','Relatório consolidado de projetos','csv,xlsx,pdf',true),
 ('ACESSOS','acessos','Mapa de acessos','Relatório de acessos por usuário e projeto','csv,xlsx,pdf',true)
ON CONFLICT (id) DO UPDATE SET
 code=excluded.code, name=excluded.name, description=excluded.description, formats=excluded.formats, active=excluded.active;

INSERT INTO report_fields (id, report_code, field_key, label, source_key, display_order, active)
VALUES
 ('projetos-codigo','projetos','codigo','Código','codigo',10,true),
 ('projetos-nome','projetos','nome','Nome do projeto','nome',20,true),
 ('projetos-area','projetos','areaResponsavel','Área responsável','areaResponsavel',30,true),
 ('projetos-status','projetos','status','Status','status',40,true),
 ('projetos-criado-em','projetos','criadoEm','Criado em','criadoEm',50,true),
 ('acessos-usuario','acessos','userName','Usuário','userName',10,true),
 ('acessos-email','acessos','userEmail','E-mail','userEmail',20,true),
 ('acessos-projeto','acessos','projectName','Projeto','projectName',30,true),
 ('acessos-nivel','acessos','accessLevel','Nível de acesso','accessLevel',40,true)
ON CONFLICT (id) DO UPDATE SET
 report_code=excluded.report_code, field_key=excluded.field_key, label=excluded.label,
 source_key=excluded.source_key, display_order=excluded.display_order, active=excluded.active;

-- Pastas raiz determinísticas para os projetos já cadastrados.
-- O hash garante o mesmo ID em todos os ambientes e evita duplicação na reaplicação.
INSERT INTO folders (id, project_id, parent_id, kind, name, size_bytes, mime_type, created_by, created_at, updated_at)
SELECT
 md5('sigac-root-folder:' || p.code),
 p.id,
 NULL,
 'pasta',
 'Documentos',
 0,
 NULL,
 u.id,
 current_timestamp,
 current_timestamp
FROM projects p
JOIN LATERAL (
    SELECT id FROM users
    WHERE role = 'administrador' OR profile_id = 'ADM'
    ORDER BY created_at, id
    LIMIT 1
) u ON true
ON CONFLICT (id) DO UPDATE SET
 project_id=excluded.project_id,
 name=excluded.name,
 kind=excluded.kind,
 updated_at=current_timestamp;

-- access_requests não recebe registros de seed: solicitações devem ser criadas por usuários.
-- A tabela é validada para garantir que o deploy encontra a estrutura transacional.
DO $$
BEGIN
    IF to_regclass(current_schema() || '.access_requests') IS NULL THEN
        RAISE EXCEPTION 'Tabela access_requests não encontrada';
    END IF;
    IF to_regclass(current_schema() || '.folders') IS NULL THEN
        RAISE EXCEPTION 'Tabela folders não encontrada';
    END IF;
END $$;

COMMIT;
