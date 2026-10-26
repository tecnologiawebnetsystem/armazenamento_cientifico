"""Primeira carga de um banco novo (ou recriado).

Reproduz os dados que não são do domínio do projeto e que existem no banco de DSV:
perfis, módulos, permissões, menus, cards, status, áreas e relatórios.

    python -m app.db.seed                    # DSV: referência + usuários de teste
    python -m app.db.seed --sample-projects  # DSV: inclui projetos fictícios
    python -m app.db.seed --confirm          # staging e produção: só referência

O que é carregado depende de ENVIRONMENT:
- development e test: dados de referência e os usuários de teste;
- staging e produção: **somente** dados de referência (sem usuários nem projetos) e
  só com --confirm;
- qualquer outro valor é recusado.

Regras:
- só insere o que falta e nunca altera ou apaga um registro existente, então pode
  ser repetido;
- o schema deve existir antes (alembic upgrade head).
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker

from app.core.config import settings
from app.modules.catalogs.models import (
    DashboardCard,
    MenuItem,
    MenuPermission,
    Module,
    Permission,
    ProfileModule,
    ProfilePermission,
    ProjectStatus,
    ReportField,
    ReportType,
    ResponsibleArea,
)
from app.modules.projects.models import Project, ProjectMember
from app.modules.users.models import Profile, User

FULL_LOAD_ENVIRONMENTS = {"development", "test"}
REFERENCE_ONLY_ENVIRONMENTS = {"staging", "production"}

PROFILES = [
    ("ADM", "administrador", "admin", "Acesso administrativo total à plataforma."),
    ("AUD", "auditor", "auditor", "Consulta registros de auditoria."),
    ("GER", "Responsável", "gerente", "Acesso às áreas de rede sob sua gestão ou supervisão."),
    ("OPR", "operador", "operador", "Acessa exclusivamente as configurações autorizadas."),
    ("PAT", "patrocinador", "patrocinador", "Acompanha áreas de rede e relatórios autorizados."),
    ("SOL", "solicitante", "solicitante", "Acompanha solicitações autorizadas."),
]

MODULES = [
    ("dashboard", "Dashboard", "/dashboard", "layout-dashboard", 1),
    ("projetos", "Área de Rede", "/projetos", "folder", 10),
    ("relatorios", "Relatórios", "/relatorios", "chart", 30),
    ("auditoria", "Logs e Auditoria", "/logs", "history", 50),
    ("pesquisas", "Mapa de Acessos", "/pesquisas", "search", 60),
    ("configuracoes", "Configurações", "/configuracoes", "settings", 70),
]

PERMISSIONS = [
    ("administracao.configurar", "configuracoes", "Configurar administração", "Gerenciar os catálogos administrativos"),
    ("auditoria.visualizar", "auditoria", "Visualizar auditoria", "Consultar registros de auditoria"),
    ("dashboard.visualizar", "dashboard", "Visualizar Dashboard", "Acessar o Dashboard"),
    ("pesquisa.visualizar", "pesquisas", "Visualizar mapa de acessos", "Consultar o mapa de acessos"),
    ("projeto.criar", "projetos", "Criar área de rede", "Cadastrar uma nova área de rede"),
    ("projeto.editar", "projetos", "Editar área de rede", "Alterar dados de uma área de rede"),
    ("projeto.excluir", "projetos", "Excluir área de rede", "Excluir uma área de rede"),
    ("projeto.status", "projetos", "Alterar status da área de rede", "Alterar o status de uma área de rede"),
    ("projeto.visualizar", "projetos", "Visualizar área de rede", "Consultar áreas de rede autorizadas"),
    ("relatorio.exportar", "relatorios", "Exportar relatórios", "Exportar relatórios nos formatos habilitados"),
    ("relatorio.visualizar", "relatorios", "Visualizar relatórios", "Consultar relatórios autorizados"),
]

# Módulos que cada perfil enxerga; os demais ficam com can_view = False.
PROFILE_MODULES = {
    "ADM": {"auditoria", "dashboard", "pesquisas", "projetos", "relatorios"},
    "AUD": {"auditoria"},
    "GER": {"dashboard", "pesquisas", "projetos", "relatorios"},
    "OPR": {"configuracoes"},
    "PAT": {"dashboard", "pesquisas", "projetos", "relatorios"},
    "SOL": set(),
}

# Permissões concedidas a cada perfil; as demais ficam com allowed = False.
PROFILE_PERMISSIONS = {
    "ADM": {
        "auditoria.visualizar", "dashboard.visualizar", "pesquisa.visualizar", "projeto.criar", "projeto.editar",
        "projeto.excluir", "projeto.status", "projeto.visualizar", "relatorio.exportar", "relatorio.visualizar",
    },
    "AUD": {"auditoria.visualizar"},
    "GER": {"dashboard.visualizar", "pesquisa.visualizar", "projeto.visualizar", "relatorio.exportar", "relatorio.visualizar"},
    "OPR": {"administracao.configurar"},
    "PAT": {"dashboard.visualizar", "pesquisa.visualizar", "projeto.visualizar", "relatorio.visualizar"},
    "SOL": set(),
}

MENUS = [
    ("menu-dashboard", "dashboard", "Dashboard", "/dashboard", "layout-dashboard", 1),
    ("menu-projetos", "projetos", "Área de Rede", "/projetos", "folder", 10),
    ("menu-relatorios", "relatorios", "Relatórios", "/relatorios", "chart", 30),
    ("menu-auditoria", "auditoria", "Logs e Auditoria", "/logs", "history", 50),
    ("menu-pesquisas", "pesquisas", "Mapa de Acessos", "/pesquisas", "search", 60),
    ("menu-configuracoes", "configuracoes", "Configurações", "/configuracoes", "settings", 70),
]

MENU_PERMISSIONS = [
    ("menu-auditoria", "auditoria.visualizar"),
    ("menu-configuracoes", "administracao.configurar"),
    ("menu-dashboard", "dashboard.visualizar"),
    ("menu-pesquisas", "pesquisa.visualizar"),
    ("menu-projetos", "projeto.visualizar"),
    ("menu-relatorios", "relatorio.visualizar"),
]

DASHBOARD_CARDS = [
    ("dashboard-projetos", "projetos", "projetos", "Projetos", "Projetos disponíveis no seu escopo.", "total_projetos", "/projetos", "ADM,GER,AUD,PAT", 10),
    ("dashboard-pendencias", "relatorios", "pendencias", "Pendências", "Itens que precisam de atenção.", "pendencias", "/relatorios", "ADM,GER,PAT", 20),
    ("dashboard-auditoria", "auditoria", "auditoria", "Auditoria", "Eventos recentes para acompanhamento.", "eventos_auditoria", "/logs", "ADM,AUD", 30),
]

PROJECT_STATUSES = [
    ("ativo", "ativo", "Ativo", "green", 10),
    ("em-implantacao", "em_implantacao", "Em implantação", "blue", 20),
    ("pausado", "pausado", "Pausado", "amber", 30),
    ("encerrado", "encerrado", "Encerrado", "slate", 40),
]

RESPONSIBLE_AREAS = [
    ("documentacao", "Documentação", "DOC"),
    ("engenharia", "Engenharia", "ENG"),
    ("governanca-compliance", "Governança e Compliance", "GC"),
    ("operacoes", "Operações", "OP"),
    ("pesquisa", "Pesquisa", "PES"),
    ("tecnologia", "Tecnologia", "TEC"),
]

REPORT_TYPES = [
    ("ACESSOS", "acessos", "Mapa de acessos", "Relatório consolidado de projetos, pastas, grupos, membros e permissões."),
    ("AUDITORIA", "auditoria", "Logs de Auditoria", "Rastreabilidade de ações, usuários, entidades e resultados."),
    ("PROJETOS", "projetos", "Relatório Executivo de Áreas de Rede", "Portfólio, status, áreas, gestores e indicadores das áreas de rede."),
]

# (id, report_code, field_key, label, source_key, display_order)
REPORT_FIELDS = [
    ("acessos-usuario-id", "acessos", "userId", "Identificador do usuário", "userId", 10),
    ("acessos-usuario", "acessos", "userName", "Membro", "userName", 20),
    ("acessos-email", "acessos", "userEmail", "E-mail", "userEmail", 30),
    ("acessos-perfil", "acessos", "userRole", "Perfil", "userRole", 40),
    ("acessos-area", "acessos", "area", "Área", "area", 50),
    ("acessos-projeto-id", "acessos", "projectId", "Identificador da área de rede", "projectId", 60),
    ("acessos-projeto", "acessos", "projectName", "Área de Rede", "projectName", 70),
    ("acessos-status", "acessos", "projectStatus", "Status da área de rede", "projectStatus", 80),
    ("acessos-recurso", "acessos", "resourceName", "Recurso", "resourceName", 90),
    ("acessos-projeto-codigo", "acessos", "projetoCodigo", "Código do área de rede", "projectCode", 100),
    ("acessos-tipo", "acessos", "resourceType", "Tipo de recurso", "resourceType", 100),
    ("acessos-atualizacao", "acessos", "lastViewedAt", "Último acesso", "lastViewedAt", 110),
    ("acessos-pasta", "acessos", "pasta", "Pasta", "folderName", 110),
    ("acessos-caminho-pasta", "acessos", "caminhoPasta", "Caminho da pasta", "folderPath", 120),
    ("acessos-grupo", "acessos", "grupo", "Grupo de acesso", "groupName", 130),
    ("acessos-permissao", "acessos", "permissao", "Permissão", "permission", 140),
    ("acessos-membro", "acessos", "membro", "Membro", "memberName", 150),
    ("acessos-membro-email", "acessos", "membroEmail", "E-mail do membro", "memberEmail", 160),
    ("acessos-membro-papel", "acessos", "membroPapel", "Papel do membro", "memberRole", 170),
    ("acessos-fonte", "acessos", "fonte", "Fonte da consulta", "source", 180),
    ("acessos-consultado-em", "acessos", "consultadoEm", "Consultado em", "queriedAt", 190),
    ("auditoria-id", "auditoria", "id", "Identificador", "id", 10),
    ("auditoria-data", "auditoria", "criadoEm", "Data e hora", "criadoEm", 20),
    ("auditoria-usuario", "auditoria", "userName", "Usuário", "userName", 30),
    ("auditoria-email", "auditoria", "userEmail", "E-mail", "userEmail", 40),
    ("auditoria-acao", "auditoria", "acao", "Ação", "acao", 50),
    ("auditoria-entidade", "auditoria", "entidade", "Entidade", "entidade", 60),
    ("auditoria-entidade-id", "auditoria", "entidadeId", "Identificador da entidade", "entidadeId", 70),
    ("auditoria-resultado", "auditoria", "resultado", "Resultado", "resultado", 80),
    ("auditoria-detalhes", "auditoria", "detalhes", "Detalhes", "detalhes", 90),
    ("projetos-codigo", "projetos", "codigo", "Código", "codigo", 10),
    ("projetos-nome", "projetos", "nome", "Área de Rede", "nome", 20),
    ("projetos-area", "projetos", "areaResponsavel", "Área responsável", "areaResponsavel", 30),
    ("projetos-status", "projetos", "status", "Status", "status", 40),
    ("projetos-gestores", "projetos", "gestoresIds", "Gestores", "gestoresIds", 50),
    ("projetos-membros", "projetos", "totalMembros", "Total de membros", "totalMembros", 60),
    ("projetos-criado", "projetos", "criadoEm", "Criado em", "criadoEm", 70),
    ("projetos-atualizado", "projetos", "atualizadoEm", "Atualizado em", "atualizadoEm", 80),
]

# (id técnico, user_id, profile_id): os ids são os do banco de DSV (não são um hash reproduzível do user_id).
USERS = [
    ("00d6e9c2068263fc359f60e88bedc875", "GBTF", "ADM"),
    ("c160beaab7af277a659ae74c0dc5d31b", "GCTL", "ADM"),
    ("1e9fcfa43f8f3fae305c85633f8f0b0f", "GFZ3", "ADM"),
    ("8256d1545f02148a93fad44a0c79646d", "Y1R9", "GER"),
]

# Dados fictícios, só com --sample-projects: (nome, código, área, descrição, status).
SAMPLE_PROJECTS = [
    ("SIGAC Modernização", "SIGAC-001", "Tecnologia", "Projeto de exemplo para testes de consulta.", "ativo"),
    ("Governança de Dados", "GOV-002", "Governança e Compliance", "Projeto de exemplo para testes de auditoria.", "ativo"),
    ("Migração do Acervo", "MIG-003", "Documentação", "Projeto de exemplo para testes de filtros e relatórios.", "encerrado"),
    ("Portal de Pesquisa", "PES-004", "Pesquisa", "Projeto de exemplo para testes de status.", "pausado"),
]


def load_scope(environment: str) -> str:
    """"full" (referência e usuários de teste) ou "reference" (só referência)."""
    name = environment.lower()
    if name in FULL_LOAD_ENVIRONMENTS:
        return "full"
    if name in REFERENCE_ONLY_ENVIRONMENTS:
        return "reference"
    known = sorted(FULL_LOAD_ENVIRONMENTS | REFERENCE_ONLY_ENVIRONMENTS)
    raise RuntimeError(f"ENVIRONMENT {environment!r} desconhecido para o seed; use um de {known}")


async def _add_if_missing(session, model, primary_key, /, **values) -> bool:
    if await session.get(model, primary_key) is not None:
        return False
    session.add(model(**values))
    return True


async def seed_reference_data(session, now: datetime) -> dict[str, int]:
    """Insere só o que falta, respeitando a ordem das chaves estrangeiras."""
    added: dict[str, int] = {}

    def count(name: str, created: bool) -> None:
        added[name] = added.get(name, 0) + int(created)

    for pid, name, role, description in PROFILES:
        count("profiles", await _add_if_missing(session, Profile, pid, id=pid, name=name, role=role, description=description, created_at=now))
    for mid, name, route, icon, order in MODULES:
        count("modules", await _add_if_missing(session, Module, mid, id=mid, name=name, route=route, icon=icon, display_order=order, active=True))
    await session.flush()

    for pid, module_id, name, description in PERMISSIONS:
        count("permissions", await _add_if_missing(session, Permission, pid, id=pid, module_id=module_id, name=name, description=description, active=True))
    for sid, code, name, color, order in PROJECT_STATUSES:
        count("project_statuses", await _add_if_missing(session, ProjectStatus, sid, id=sid, code=code, name=name, color=color, display_order=order, active=True, allows_edit=True))
    for aid, name, prefix in RESPONSIBLE_AREAS:
        count("responsible_areas", await _add_if_missing(session, ResponsibleArea, aid, id=aid, name=name, prefix=prefix, next_number=1, active=True, created_at=now, updated_at=now))
    for rid, code, name, description in REPORT_TYPES:
        count("report_types", await _add_if_missing(session, ReportType, rid, id=rid, code=code, name=name, description=description, formats="csv,txt,pdf", active=True))
    await session.flush()

    for fid, report_code, field_key, label, source_key, order in REPORT_FIELDS:
        count("report_fields", await _add_if_missing(session, ReportField, fid, id=fid, report_code=report_code, field_key=field_key, label=label, source_key=source_key, display_order=order, active=True))
    for mid, module_id, name, route, icon, order in MENUS:
        count("menus", await _add_if_missing(session, MenuItem, mid, id=mid, module_id=module_id, parent_id=None, name=name, route=route, icon=icon, display_order=order, active=True))
    for cid, module_id, key, title, description, metric, route, profiles, order in DASHBOARD_CARDS:
        count("dashboard_cards", await _add_if_missing(session, DashboardCard, cid, id=cid, module_id=module_id, key=key, title=title, description=description, metric_key=metric, route=route, profile_ids=profiles, display_order=order, active=True))
    await session.flush()

    for menu_id, permission_id in MENU_PERMISSIONS:
        count("menu_permissions", await _add_if_missing(session, MenuPermission, {"menu_id": menu_id, "permission_id": permission_id}, menu_id=menu_id, permission_id=permission_id, allowed=True))
    for profile_id, *_ in PROFILES:
        for module_id, *_ in MODULES:
            count("profile_modules", await _add_if_missing(session, ProfileModule, {"profile_id": profile_id, "module_id": module_id}, profile_id=profile_id, module_id=module_id, can_view=module_id in PROFILE_MODULES[profile_id]))
        for permission_id, *_ in PERMISSIONS:
            count("profile_permissions", await _add_if_missing(session, ProfilePermission, {"profile_id": profile_id, "permission_id": permission_id}, profile_id=profile_id, permission_id=permission_id, allowed=permission_id in PROFILE_PERMISSIONS[profile_id]))
    await session.flush()
    return added


async def seed_users(session, now: datetime) -> int:
    created = 0
    for technical_id, user_id, profile_id in USERS:
        exists = await session.scalar(select(User).where(User.user_id == user_id))
        if exists is None:
            session.add(User(id=technical_id, user_id=user_id, profile_id=profile_id, created_at=now))
            created += 1
    await session.flush()
    return created


async def seed_sample_projects(session, now: datetime) -> int:
    admin = await session.scalar(select(User).where(User.user_id == USERS[0][1]))
    existing_codes = set((await session.scalars(select(Project.code))).all())
    created = 0
    for index, (name, code, area, description, status) in enumerate(SAMPLE_PROJECTS, start=1):
        if code in existing_codes:
            continue
        project = Project(
            id=str(uuid4()), name=name, code=code, responsible_area=area, managers_ids=[admin.id],
            write_group="SIGAC-Escrita", read_group="SIGAC-Leitura", write_identity_role="administrador",
            read_identity_role="consultor", snow_task_number=f"TASK{1000 + index}", parent_folder=f"/Projetos/{code}",
            description=description, status=status, participants_ids=[admin.id], created_at=now, updated_at=now,
        )
        session.add(project)
        await session.flush()
        session.add(ProjectMember(project_id=project.id, user_id=admin.id, role="administrador", created_at=now))
        created += 1
    await session.flush()
    return created


async def initialize_database(engine: AsyncEngine, *, sample_projects: bool = False) -> dict[str, int]:
    scope = load_scope(settings.environment)
    if sample_projects and scope != "full":
        raise RuntimeError("Projetos de exemplo só podem ser carregados em development ou test")
    factory = async_sessionmaker(engine, expire_on_commit=False)
    now = datetime.now(UTC)
    async with factory() as session:
        added = await seed_reference_data(session, now)
        if scope == "full":
            added["users"] = await seed_users(session, now)
        if sample_projects:
            added["projects"] = await seed_sample_projects(session, now)
        await session.commit()
    return added


async def _main(sample_projects: bool) -> None:
    from app.db import session as db_session

    db_session.configure_engine()
    if db_session.engine is None:
        raise RuntimeError("Banco não configurado; defina DATABASE_URL ou RDS_AURORA_POSTGRES_*")
    try:
        added = await initialize_database(db_session.engine, sample_projects=sample_projects)
    finally:
        await db_session.dispose_engine()
    print(f"Seed concluído (engine={settings.database_engine}, environment={settings.environment}, escopo={load_scope(settings.environment)}):")
    for table, total in added.items():
        print(f"  {table}: {total} inserido(s)")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Primeira carga de dados de referência de um banco novo.")
    parser.add_argument("--sample-projects", action="store_true", help="inclui projetos fictícios (só development e test)")
    parser.add_argument("--confirm", action="store_true", help="obrigatório em staging e produção")
    arguments = parser.parse_args(argv)
    try:
        scope = load_scope(settings.environment)
        if arguments.sample_projects and scope != "full":
            raise RuntimeError("--sample-projects só é permitido em development ou test")
        if scope == "reference" and not arguments.confirm:
            raise RuntimeError(
                f"ENVIRONMENT={settings.environment!r} exige --confirm; serão carregados somente os dados de referência"
            )
    except RuntimeError as error:
        print(error, file=sys.stderr)
        return 2
    asyncio.run(_main(arguments.sample_projects))
    return 0


__all__ = ["initialize_database", "main"]

if __name__ == "__main__":
    sys.exit(main())
