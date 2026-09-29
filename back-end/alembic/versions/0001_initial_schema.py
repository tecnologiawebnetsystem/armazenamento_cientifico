"""Baseline consolidada para Homologação e Produção.

Esta revisão representa o schema final do SIGAC para bancos novos.
O banco de Desenvolvimento não deve ser migrado por esta revisão: ele já
possui o schema e deve apenas servir como referência operacional.

As tabelas são criadas por operações explícitas (não por
``Base.metadata.create_all``) para que esta revisão continue reproduzível
mesmo depois que os models evoluírem em migrations futuras. Qualquer
alteração de schema a partir de agora deve ser feita em uma nova revision.

A carga de parâmetros é executada separadamente pelo seed idempotente.
"""

from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa

from alembic import op

revision: str = "0001_production_baseline"
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "profiles",
        sa.Column("id", sa.String(length=20), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "modules",
        sa.Column("id", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("route", sa.String(length=180), nullable=False),
        sa.Column("icon", sa.String(length=80), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "project_statuses",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("code", sa.String(length=40), nullable=False),
        sa.Column("nome", sa.String(length=100), nullable=False),
        sa.Column("color", sa.String(length=20), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("allows_edit", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_table(
        "report_types",
        sa.Column("id", sa.String(length=60), nullable=False),
        sa.Column("code", sa.String(length=60), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("formats", sa.Text(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_table(
        "responsible_areas",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("prefix", sa.String(length=20), nullable=False),
        sa.Column("next_number", sa.Integer(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("prefix"),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("job_title", sa.String(length=120), nullable=True),
        sa.Column("area", sa.String(length=120), nullable=True),
        sa.Column("avatar_url", sa.String(length=500), nullable=True),
        sa.Column("last_login_at", sa.DateTime(), nullable=True),
        sa.Column("role", sa.String(length=40), nullable=False),
        sa.Column("profile_id", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["profile_id"], ["profiles.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "projects",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("responsible_area", sa.String(length=160), nullable=False),
        sa.Column("managers_ids", sa.JSON(), nullable=False),
        sa.Column("write_group", sa.String(length=160), nullable=False),
        sa.Column("read_group", sa.String(length=160), nullable=False),
        sa.Column("write_identity_role", sa.String(length=160), nullable=False),
        sa.Column("read_identity_role", sa.String(length=160), nullable=False),
        sa.Column("snow_task_number", sa.String(length=120), nullable=False),
        sa.Column("parent_folder", sa.String(length=500), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("participants_ids", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "permissions",
        sa.Column("id", sa.String(length=80), nullable=False),
        sa.Column("module_id", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["module_id"], ["modules.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "report_fields",
        sa.Column("id", sa.String(length=60), nullable=False),
        sa.Column("report_code", sa.String(length=60), nullable=False),
        sa.Column("field_key", sa.String(length=100), nullable=False),
        sa.Column("label", sa.String(length=160), nullable=False),
        sa.Column("source_key", sa.String(length=160), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["report_code"], ["report_types.code"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "menus",
        sa.Column("id", sa.String(length=80), nullable=False),
        sa.Column("module_id", sa.String(length=80), nullable=True),
        sa.Column("parent_id", sa.String(length=80), nullable=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("route", sa.String(length=180), nullable=False),
        sa.Column("icon", sa.String(length=80), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["module_id"], ["modules.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "dashboard_cards",
        sa.Column("id", sa.String(length=80), nullable=False),
        sa.Column("module_id", sa.String(length=80), nullable=True),
        sa.Column("key", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=140), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("metric_key", sa.String(length=80), nullable=False),
        sa.Column("route", sa.String(length=180), nullable=False),
        sa.Column("profile_ids", sa.Text(), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["module_id"], ["modules.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key"),
    )
    op.create_table(
        "project_members",
        sa.Column("project_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("project_id", "user_id"),
    )
    op.create_table(
        "folders",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("project_id", sa.String(length=36), nullable=False),
        sa.Column("parent_id", sa.String(length=36), nullable=True),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("name", sa.String(length=500), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("mime_type", sa.String(length=160), nullable=True),
        sa.Column("created_by", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["parent_id"], ["folders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "activity_logs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=255), nullable=True),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("entity", sa.String(length=100), nullable=False),
        sa.Column("entity_id", sa.String(length=36), nullable=True),
        sa.Column("details", sa.Text(), nullable=False),
        sa.Column("result", sa.String(length=30), nullable=False),
        sa.Column("project_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "profile_permissions",
        sa.Column("profile_id", sa.String(length=20), nullable=False),
        sa.Column("permission_id", sa.String(length=80), nullable=False),
        sa.Column("allowed", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["profile_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["permission_id"], ["permissions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("profile_id", "permission_id"),
    )
    op.create_table(
        "profile_modules",
        sa.Column("profile_id", sa.String(length=20), nullable=False),
        sa.Column("module_id", sa.String(length=80), nullable=False),
        sa.Column("can_view", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["profile_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["module_id"], ["modules.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("profile_id", "module_id"),
    )
    op.create_table(
        "menu_permissions",
        sa.Column("menu_id", sa.String(length=80), nullable=False),
        sa.Column("permission_id", sa.String(length=80), nullable=False),
        sa.Column("allowed", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["menu_id"], ["menus.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["permission_id"], ["permissions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("menu_id", "permission_id"),
    )

    # Índices que refletem `index=True` nos models (não recriados pelas UniqueConstraint acima).
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_profile_id", "users", ["profile_id"])
    op.create_index("ix_projects_code", "projects", ["code"], unique=True)
    op.create_index("ix_projects_status", "projects", ["status"])
    op.create_index("ix_permissions_module_id", "permissions", ["module_id"])
    op.create_index("ix_report_fields_report_code", "report_fields", ["report_code"])
    op.create_index("ix_responsible_areas_name", "responsible_areas", ["name"], unique=True)
    op.create_index("ix_responsible_areas_active", "responsible_areas", ["active"])
    op.create_index("ix_project_members_project_id", "project_members", ["project_id"])
    op.create_index("ix_folders_project_id", "folders", ["project_id"])
    op.create_index("ix_folders_parent_id", "folders", ["parent_id"])
    op.create_index("ix_folders_created_by", "folders", ["created_by"])
    op.create_index("ix_activity_logs_user_id", "activity_logs", ["user_id"])
    op.create_index("ix_activity_logs_action", "activity_logs", ["action"])
    op.create_index("ix_activity_logs_entity", "activity_logs", ["entity"])
    op.create_index("ix_activity_logs_project_id", "activity_logs", ["project_id"])
    op.create_index("ix_activity_logs_created_at", "activity_logs", ["created_at"])

    # Perfis oficiais da produção; perfis legados não fazem parte da baseline.
    from app.modules.users.profile_model import Profile

    bind = op.get_bind()
    # PostgreSQL é o padrão; SQLite é aceito apenas como alternativa de desenvolvimento local.
    if bind.dialect.name == "sqlite":
        from sqlalchemy.dialects.sqlite import insert
    else:
        from sqlalchemy.dialects.postgresql import insert

    seeded_at = datetime.now(UTC).replace(tzinfo=None)
    bind.execute(
        insert(Profile).values([
            {"id": "ADM", "name": "administrador", "description": "Administra a plataforma, configura parâmetros e gerencia acessos.", "created_at": seeded_at},
            {"id": "GER", "name": "gerente", "description": "Coordena projetos, equipes e atividades operacionais.", "created_at": seeded_at},
            {"id": "AUD", "name": "auditor", "description": "Consulta informações e acompanha os registros de auditoria.", "created_at": seeded_at},
            {"id": "PAT", "name": "patrocinador", "description": "Acompanha resultados e aprova solicitações sob sua responsabilidade.", "created_at": seeded_at},
            {"id": "SOL", "name": "solicitante", "description": "Solicita acessos e acompanha o andamento das solicitações.", "created_at": seeded_at},
        ]).on_conflict_do_nothing(index_elements=["id"])
    )


def downgrade() -> None:
    raise RuntimeError(
        "A baseline de produção não possui downgrade automático. "
        "Use backup e procedimento de rollback aprovado."
    )
