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
        sa.Column("description", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
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
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("color", sa.String(length=20), nullable=False, server_default="slate"),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("allows_edit", sa.Boolean(), nullable=False, server_default=sa.true()),
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
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("prefix"),
    )
    op.create_table(
        "users",
sa.Column("id", sa.String(length=32), nullable=False, server_default=sa.text("md5(random()::text || clock_timestamp()::text)")),
  sa.Column("user_id", sa.String(length=80), nullable=False),
        sa.Column("profile_id", sa.String(length=20), nullable=True),
        sa.Column("last_login_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["profile_id"], ["profiles.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_table(
        "sessions",
        sa.Column("id", sa.String(length=128), nullable=False),
        sa.Column("user_id", sa.String(length=32), nullable=False),
        sa.Column("profile_id", sa.String(length=20), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("current_timestamp")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["profile_id"], ["profiles.id"], ondelete="RESTRICT"),
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
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
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
        sa.UniqueConstraint("report_code", "field_key"),
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
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(["module_id"], ["modules.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["parent_id"], ["menus.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "dashboard_cards",
        sa.Column("id", sa.String(length=80), nullable=False),
        sa.Column("module_id", sa.String(length=80), nullable=True),
        sa.Column("key", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=140), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("metric_key", sa.String(length=80), nullable=False),
        sa.Column("route", sa.String(length=180), nullable=False, server_default=""),
        sa.Column("profile_ids", sa.Text(), nullable=False, server_default=""),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(["module_id"], ["modules.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key"),
    )
    op.create_table(
        "project_members",
        sa.Column("project_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=40), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("project_id", "user_id"),
    )
    op.create_table(
        "folders",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("project_id", sa.String(length=36), nullable=False),
        sa.Column("parent_id", sa.String(length=36), nullable=True),
        sa.Column("kind", sa.String(length=20), nullable=False, server_default="pasta"),
        sa.Column("name", sa.String(length=500), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("mime_type", sa.String(length=160), nullable=True),
        sa.Column("created_by", sa.String(length=255), nullable=False),
        sa.Column("last_viewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("kind = 'pasta'", name="ck_folders_kind_pasta"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["parent_id"], ["folders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "activity_logs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=255), nullable=True),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("entity", sa.String(length=100), nullable=False),
        sa.Column("entity_id", sa.String(length=36), nullable=True),
        sa.Column("details", sa.Text(), nullable=False, server_default=""),
        sa.Column("result", sa.String(length=30), nullable=False, server_default="success"),
        sa.Column("project_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="SET NULL"),
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
    op.create_index("ix_users_user_id", "users", ["user_id"], unique=True)
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
    op.create_index("ix_activity_logs_project_id", "activity_logs", ["project_id"])
    op.create_index("ix_activity_logs_action", "activity_logs", ["action"])
    op.create_index("ix_activity_logs_entity", "activity_logs", ["entity"])
    op.create_index("ix_activity_logs_created_at", "activity_logs", ["created_at"])

    # Perfis oficiais da produção; perfis legados não fazem parte da baseline.
    bind = op.get_bind()

    def execute_sql_script(script: str) -> None:
        for statement in script.split(";"):
            statement = statement.strip()
            if statement:
                bind.execute(sa.text(statement))

    execute_sql_script(
        """
        INSERT INTO profiles (id, name, description) VALUES
        ('ADM', 'administrador', 'Administra a plataforma, configura parâmetros e gerencia acessos.'),
        ('GER', 'gerente', 'Coordena projetos, equipes e atividades operacionais.'),
        ('AUD', 'auditor', 'Consulta informações e acompanha os registros de auditoria.'),
        ('PAT', 'patrocinador', 'Acompanha resultados e aprova solicitações sob sua responsabilidade.'),
        ('SOL', 'solicitante', 'Solicita acessos e acompanha o andamento das solicitações.'),
        ('OPR', 'operador', 'Acessa exclusivamente o menu Configurações.')
        ON CONFLICT (id) DO UPDATE SET name = excluded.name, description = excluded.description;
        """
    )

    # Catálogos e relações iniciais da aplicação. O seed é idempotente para
    # permitir que a baseline seja aplicada em bancos já parcialmente povoados.
    execute_sql_script(
        """
        INSERT INTO users (id, user_id, profile_id) VALUES
        ('5d25f562b21d7002b1631ad43e57a74c', 'GFZ3', 'ADM')
        ON CONFLICT (id) DO UPDATE SET user_id = excluded.user_id, profile_id = excluded.profile_id;

        INSERT INTO modules (id, name, route, icon, display_order, active) VALUES
        ('dashboard', 'Dashboard', '/dashboard', 'layout-dashboard', 1, true),
        ('projetos', 'Projetos', '/projetos', 'folder', 10, true),
        ('relatorios', 'Relatórios', '/relatorios', 'chart', 30, true),
        ('auditoria', 'Logs e Auditoria', '/logs', 'history', 50, true),
        ('pesquisas', 'Mapa de Acessos', '/pesquisas', 'search', 60, true),
        ('configuracoes', 'Configurações', '/configuracoes', 'settings', 70, true)
        ON CONFLICT (id) DO UPDATE SET name = excluded.name, route = excluded.route, icon = excluded.icon, display_order = excluded.display_order, active = excluded.active;

        INSERT INTO permissions (id, module_id, name, description, active) VALUES
        ('dashboard.visualizar', 'dashboard', 'Visualizar Dashboard', 'Acessar o Dashboard da plataforma', true),
        ('projeto.visualizar', 'projetos', 'Visualizar projetos', 'Visualizar projetos', true),
        ('projeto.criar', 'projetos', 'Criar projetos', 'Criar projetos', true),
        ('projeto.editar', 'projetos', 'Editar projetos', 'Editar projetos', true),
        ('projeto.status', 'projetos', 'Alterar status', 'Alterar status de projetos', true),
        ('projeto.excluir', 'projetos', 'Excluir projetos', 'Excluir projetos', true),
        ('relatorio.visualizar', 'relatorios', 'Visualizar relatórios', 'Visualizar relatórios', true),
        ('relatorio.exportar', 'relatorios', 'Exportar relatórios', 'Exportar CSV, TXT e PDF', true),
        ('auditoria.visualizar', 'auditoria', 'Visualizar auditoria', 'Visualizar logs de auditoria', true),
        ('pesquisa.visualizar', 'pesquisas', 'Visualizar mapa de acessos', 'Consultar projetos, grupos, membros, pastas e níveis', true),
        ('administracao.configurar', 'configuracoes', 'Configurar administração', 'Editar módulos, menus, permissões, perfis e relatórios', true)
        ON CONFLICT (id) DO UPDATE SET module_id = excluded.module_id, name = excluded.name, description = excluded.description, active = excluded.active;

        INSERT INTO menus (id, module_id, name, route, icon, display_order, active) VALUES
        ('menu-dashboard', 'dashboard', 'Dashboard', '/dashboard', 'layout-dashboard', 1, true),
        ('menu-projetos', 'projetos', 'Projetos', '/projetos', 'folder', 10, true),
        ('menu-relatorios', 'relatorios', 'Relatórios', '/relatorios', 'chart', 30, true),
        ('menu-auditoria', 'auditoria', 'Logs e Auditoria', '/logs', 'history', 50, true),
        ('menu-pesquisas', 'pesquisas', 'Mapa de Acessos', '/pesquisas', 'search', 60, true),
        ('menu-configuracoes', 'configuracoes', 'Configurações', '/configuracoes', 'settings', 70, true)
        ON CONFLICT (id) DO UPDATE SET module_id = excluded.module_id, name = excluded.name, route = excluded.route, icon = excluded.icon, display_order = excluded.display_order, active = excluded.active;

        INSERT INTO menu_permissions (menu_id, permission_id, allowed) VALUES
        ('menu-dashboard', 'dashboard.visualizar', true),
        ('menu-projetos', 'projeto.visualizar', true), ('menu-relatorios', 'relatorio.visualizar', true),
        ('menu-auditoria', 'auditoria.visualizar', true), ('menu-pesquisas', 'pesquisa.visualizar', true),
        ('menu-configuracoes', 'administracao.configurar', true)
        ON CONFLICT (menu_id, permission_id) DO UPDATE SET allowed = excluded.allowed;

        INSERT INTO project_statuses (id, code, name, color, display_order, active) VALUES
        ('ativo', 'ativo', 'Ativo', 'green', 10, true), ('em-implantacao', 'em_implantacao', 'Em implantação', 'blue', 20, true),
        ('pausado', 'pausado', 'Pausado', 'amber', 30, true), ('encerrado', 'encerrado', 'Encerrado', 'slate', 40, true)
        ON CONFLICT (id) DO UPDATE SET code = excluded.code, name = excluded.name, color = excluded.color, display_order = excluded.display_order, active = excluded.active;

        INSERT INTO responsible_areas (id, name, prefix, next_number, active, created_at, updated_at) VALUES
        ('tecnologia', 'Tecnologia', 'TEC', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('pesquisa', 'Pesquisa', 'PES', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('engenharia', 'Engenharia', 'ENG', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('operacoes', 'Operações', 'OP', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('governanca-compliance', 'Governança e Compliance', 'GC', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('documentacao', 'Documentação', 'DOC', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET name = excluded.name, prefix = excluded.prefix, active = true;

        INSERT INTO report_types (id, code, name, description, formats, active) VALUES
        ('PROJETOS', 'projetos', 'Relatório Executivo de Projetos', 'Portfólio, status, áreas, gestores e indicadores.', 'csv,txt,pdf', true),
        ('ACESSOS', 'acessos', 'Mapa de Acessos Científico', 'Projetos, grupos, membros, pastas e níveis de acesso.', 'csv,txt,pdf', true),
        ('AUDITORIA', 'auditoria', 'Logs de Auditoria', 'Rastreabilidade de ações, usuários, entidades e resultados.', 'csv,txt,pdf', true)
        ON CONFLICT (id) DO UPDATE SET code = excluded.code, name = excluded.name, description = excluded.description, formats = excluded.formats, active = true;

        INSERT INTO report_fields (id, report_code, field_key, label, source_key, display_order, active) VALUES
        ('projetos-codigo', 'projetos', 'codigo', 'Código', 'codigo', 10, true), ('projetos-nome', 'projetos', 'nome', 'Projeto', 'nome', 20, true),
        ('projetos-area', 'projetos', 'areaResponsavel', 'Área responsável', 'areaResponsavel', 30, true), ('projetos-status', 'projetos', 'status', 'Status', 'status', 40, true),
        ('projetos-gestores', 'projetos', 'gestoresIds', 'Gestores', 'gestoresIds', 50, true), ('projetos-membros', 'projetos', 'totalMembros', 'Total de membros', 'totalMembros', 60, true),
        ('projetos-criado', 'projetos', 'criadoEm', 'Criado em', 'criadoEm', 70, true), ('projetos-atualizado', 'projetos', 'atualizadoEm', 'Atualizado em', 'atualizadoEm', 80, true),
        ('acessos-usuario-id', 'acessos', 'userId', 'Identificador do usuário', 'userId', 10, true), ('acessos-usuario', 'acessos', 'userName', 'Membro', 'userName', 20, true),
        ('acessos-email', 'acessos', 'userEmail', 'E-mail', 'userEmail', 30, true), ('acessos-perfil', 'acessos', 'userRole', 'Perfil', 'userRole', 40, true),
        ('acessos-area', 'acessos', 'area', 'Área', 'area', 50, true), ('acessos-projeto-id', 'acessos', 'projectId', 'Identificador do projeto', 'projectId', 60, true),
        ('acessos-projeto', 'acessos', 'projectName', 'Projeto', 'projectName', 70, true), ('acessos-status', 'acessos', 'projectStatus', 'Status do projeto', 'projectStatus', 80, true),
        ('acessos-recurso', 'acessos', 'resourceName', 'Recurso', 'resourceName', 90, true), ('acessos-tipo', 'acessos', 'resourceType', 'Tipo de recurso', 'resourceType', 100, true),
        ('acessos-atualizacao', 'acessos', 'lastViewedAt', 'Último acesso', 'lastViewedAt', 110, true), ('auditoria-id', 'auditoria', 'id', 'Identificador', 'id', 10, true),
        ('auditoria-data', 'auditoria', 'criadoEm', 'Data e hora', 'criadoEm', 20, true), ('auditoria-usuario', 'auditoria', 'userName', 'Usuário', 'userName', 30, true),
        ('auditoria-email', 'auditoria', 'userEmail', 'E-mail', 'userEmail', 40, true), ('auditoria-acao', 'auditoria', 'acao', 'Ação', 'acao', 50, true),
        ('auditoria-entidade', 'auditoria', 'entidade', 'Entidade', 'entidade', 60, true), ('auditoria-entidade-id', 'auditoria', 'entidadeId', 'Identificador da entidade', 'entidadeId', 70, true),
        ('auditoria-resultado', 'auditoria', 'resultado', 'Resultado', 'resultado', 80, true), ('auditoria-detalhes', 'auditoria', 'detalhes', 'Detalhes', 'detalhes', 90, true)
        ON CONFLICT (id) DO UPDATE SET report_code = excluded.report_code, field_key = excluded.field_key, label = excluded.label, source_key = excluded.source_key, display_order = excluded.display_order, active = true;

        INSERT INTO dashboard_cards (id, module_id, key, title, description, metric_key, route, profile_ids, display_order) VALUES
        ('dashboard-projetos', 'projetos', 'projetos', 'Projetos', 'Projetos disponíveis no seu escopo.', 'total_projetos', '/projetos', 'ADM,GER,AUD,PAT', 10),
        ('dashboard-pendencias', 'relatorios', 'pendencias', 'Pendências', 'Itens que precisam de atenção.', 'pendencias', '/relatorios', 'ADM,GER,PAT', 20),
        ('dashboard-auditoria', 'auditoria', 'auditoria', 'Auditoria', 'Eventos recentes para acompanhamento.', 'eventos_auditoria', '/logs', 'ADM,AUD', 30)
        ON CONFLICT (key) DO UPDATE SET module_id = excluded.module_id, title = excluded.title, description = excluded.description, metric_key = excluded.metric_key, route = excluded.route, profile_ids = excluded.profile_ids, active = true;
        """
    )

    execute_sql_script(
        """
        INSERT INTO profile_modules (profile_id, module_id, can_view)
        SELECT p.id, m.id,
            CASE WHEN p.id = 'ADM' THEN m.id <> 'configuracoes' WHEN p.id = 'OPR' THEN m.id = 'configuracoes' WHEN p.id = 'AUD' THEN m.id = 'auditoria' WHEN m.id = 'dashboard' THEN p.id IN ('ADM', 'GER', 'PAT') WHEN m.id = 'configuracoes' THEN false
            WHEN m.id = 'auditoria' THEN p.id IN ('ADM')
            WHEN m.id IN ('relatorios', 'pesquisas') THEN p.id IN ('GER', 'PAT', 'ADM')
            ELSE p.id IN ('GER', 'PAT', 'ADM') END
        FROM profiles p CROSS JOIN modules m
        ON CONFLICT (profile_id, module_id) DO UPDATE SET can_view = excluded.can_view;

        INSERT INTO profile_permissions (profile_id, permission_id, allowed)
        SELECT p.id, x.permission_id,
            CASE WHEN p.id = 'ADM' THEN x.permission_id <> 'administracao.configurar' WHEN p.id = 'OPR' THEN x.permission_id = 'administracao.configurar' WHEN p.id = 'AUD' THEN x.permission_id = 'auditoria.visualizar' WHEN x.permission_id = 'dashboard.visualizar' THEN p.id IN ('ADM', 'GER', 'PAT') WHEN x.permission_id = 'projeto.visualizar' THEN p.id IN ('GER', 'PAT')
            WHEN x.permission_id = 'relatorio.visualizar' THEN p.id IN ('GER', 'PAT')
            WHEN x.permission_id = 'relatorio.exportar' THEN p.id IN ('ADM', 'GER')
            WHEN x.permission_id = 'auditoria.visualizar' THEN p.id IN ('ADM')
            WHEN x.permission_id = 'pesquisa.visualizar' THEN p.id IN ('ADM', 'GER', 'PAT') ELSE false END
        FROM profiles p CROSS JOIN (VALUES
            ('dashboard.visualizar'), ('projeto.visualizar'), ('projeto.criar'), ('projeto.editar'), ('projeto.status'), ('projeto.excluir'),
            ('relatorio.visualizar'), ('relatorio.exportar'), ('auditoria.visualizar'), ('pesquisa.visualizar'), ('administracao.configurar')
        ) AS x(permission_id)
        ON CONFLICT (profile_id, permission_id) DO UPDATE SET allowed = excluded.allowed;
        """
    )


def downgrade() -> None:
    raise RuntimeError(
        "A baseline de produção não possui downgrade automático. "
        "Use backup e procedimento de rollback aprovado."
    )
