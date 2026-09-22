"""Baseline consolidada para Homologação e Produção.

Esta revisão representa o schema final do SIGAC para bancos novos.
O banco de Desenvolvimento não deve ser migrado por esta revisão: ele já
possui o schema e deve apenas servir como referência operacional.

A carga de parâmetros é executada separadamente pelo seed idempotente.
"""

from collections.abc import Sequence

from sqlalchemy import text

from alembic import op

revision: str = "0001_production_baseline"
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    import app.db.models  # noqa: F401 - registra todos os modelos no metadata
    from app.db.base import Base

    bind = op.get_bind()
    expected_tables = {
        "activity_logs", "dashboard_cards", "folders",
        "menu_permissions", "menus", "modules", "permissions", "profile_modules",
        "profile_permissions", "profiles", "project_members", "project_statuses",
        "projects", "report_fields", "report_types",
        "responsible_areas", "users",
    }
    registered_tables = set(Base.metadata.tables)
    missing_tables = expected_tables - registered_tables
    if missing_tables:
        raise RuntimeError(
            "Modelos não registrados na baseline: " + ", ".join(sorted(missing_tables))
        )

    # Uma única chamada cria todas as tabelas registradas no metadata ORM.
    Base.metadata.create_all(bind=bind, checkfirst=True)
    bind.execute(text("""
        CREATE TABLE IF NOT EXISTS sessions (
            id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(255) NULL,
  email VARCHAR(320) NOT NULL,
  display_name VARCHAR(255),
            profile_id VARCHAR(20) NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """))
    # Compatibilidade com bancos que já possuem a tabela sessions legada.
    # As colunas são adicionadas antes dos índices e permanecem nullable para
    # não invalidar sessões históricas sem e-mail/perfil corporativo.
    bind.execute(text("ALTER TABLE sessions ALTER COLUMN user_id DROP NOT NULL"))
    bind.execute(text("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS email VARCHAR(320)"))
    bind.execute(text("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS profile_id VARCHAR(20)"))
    bind.execute(text("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP"))
    bind.execute(text("ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey"))
    bind.execute(text("ALTER TABLE sessions ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::text"))
    bind.execute(text("ALTER TABLE sessions DROP COLUMN IF EXISTS cav4_subject"))
    bind.execute(text("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS display_name VARCHAR(255)"))
    bind.execute(text("UPDATE sessions s SET display_name = NULLIF(TRIM(u.name), '') FROM users u WHERE s.display_name IS NULL AND u.id = s.user_id AND NULLIF(TRIM(u.name), '') IS NOT NULL"))
    bind.execute(text("ALTER TABLE project_members DROP CONSTRAINT IF EXISTS project_members_user_id_fkey"))
    bind.execute(text("ALTER TABLE project_members ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::text"))
    bind.execute(text("ALTER TABLE project_members DROP COLUMN IF EXISTS role"))
    bind.execute(text("ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey"))
    bind.execute(text("ALTER TABLE activity_logs ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::text"))
    bind.execute(text("CREATE INDEX IF NOT EXISTS ix_sessions_email ON sessions(email)"))
    bind.execute(text("CREATE INDEX IF NOT EXISTS ix_sessions_profile_id ON sessions(profile_id)"))
    bind.execute(text("CREATE INDEX IF NOT EXISTS ix_sessions_expires_at ON sessions(expires_at)"))

    # Perfis oficiais da produção; perfis legados não fazem parte da baseline.
    from sqlalchemy.dialects.postgresql import insert

    from app.modules.users.profile_model import Perfil

    bind.execute(
        insert(Perfil).values([
            {"id": "ADM", "name": "administrador", "description": "Administra a plataforma, configura parâmetros e gerencia acessos."},
            {"id": "GER", "name": "gerente", "description": "Coordena projetos, equipes e atividades operacionais."},
            {"id": "AUD", "name": "auditor", "description": "Consulta informações e acompanha os registros de auditoria."},
            {"id": "PAT", "name": "patrocinador", "description": "Acompanha resultados e aprova solicitações sob sua responsabilidade."},
            {"id": "SOL", "name": "solicitante", "description": "Solicita acessos e acompanha o andamento das solicitações."},
        ]).on_conflict_do_nothing(index_elements=["id"])
    )


def downgrade() -> None:
    raise RuntimeError(
        "A baseline de produção não possui downgrade automático. "
        "Use backup e procedimento de rollback aprovado."
    )
