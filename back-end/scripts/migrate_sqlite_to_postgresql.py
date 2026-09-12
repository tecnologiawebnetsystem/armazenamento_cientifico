from __future__ import annotations

"""Sincroniza o banco SQLite canônico com o PostgreSQL/Neon.

Uso seguro:
  uv run python scripts/migrate_sqlite_to_postgresql.py        # somente diagnóstico
  uv run python scripts/migrate_sqlite_to_postgresql.py --apply # substitui dados no Neon

O SQLite é a fonte de verdade. O modo --apply executa a sincronização em uma
transação, sem tocar em tabelas gerenciadas por Neon Auth.
"""

import argparse
import asyncio
import json
import os
import sqlite3
from datetime import date, datetime
from pathlib import Path
from typing import Any

import asyncpg

SOURCE = Path(__file__).resolve().parents[1] / "data" / "sigac.db"
SKIP = {"alembic_version", "settings"}
MANAGED_BY_NEON = {"user", "session", "account", "verification"}

# Tabelas legadas em português são convertidas para as tabelas canônicas em inglês.
TABLE_MAP = {
    "perfis": "profiles",
    "modulos": "modules",
    "permissoes": "permissions",
    "perfil_permissoes": "profile_permissions",
    "perfil_modulos": "profile_modules",
    "status_projetos": "project_statuses",
    "tipos_projetos": "project_types",
    "tipos_relatorios": "report_types",
    "configuracoes_sistema": "system_settings",
}
COLUMN_MAP = {
    "nome": "name", "descricao": "description", "criado_em": "created_at",
    "cargo": "job_title", "perfil_id": "profile_id", "modulo_id": "module_id",
    "permissao_id": "permission_id", "permitido": "allowed", "pode_visualizar": "can_view",
    "codigo": "code", "cor": "color", "ordem": "display_order", "ativo": "active",
    "rota": "route", "icone": "icon", "permite_edicao": "allows_edit", "chave": "key",
    "valor": "value", "tipo": "value_type", "grupo": "group_name", "formatos": "formats",
    "papel": "role", "level": "access_level",
}

# Dependências primeiro: a limpeza ocorre na ordem inversa para respeitar FKs.
PREFERRED_ORDER = [
    "profiles", "users", "modules", "permissions", "profile_permissions", "profile_modules",
    "project_statuses", "project_types", "system_settings", "report_types", "report_fields",
    "menus", "projects", "project_members", "files", "file_shares", "groups", "group_members",
    "file_permissions", "access_requests", "notifications", "activity_logs", "sessions",
    "permission_matrix", "responsible_areas",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="aplica a substituição no Neon")
    return parser.parse_args()


def normalize(value: Any, source_column: str) -> Any:
    if value is None:
        return None
    if isinstance(value, bytes):
        return value.decode("utf-8")
    if source_column in {"ativo", "permitido", "pode_visualizar", "permite_edicao", "active", "allowed", "can_view"}:
        return bool(value)
    if isinstance(value, (list, dict)):
        return json.dumps(value)
    if isinstance(value, str) and value.startswith(("[", "{")):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, (list, dict)):
                return json.dumps(parsed)
        except json.JSONDecodeError:
            pass
    if isinstance(value, (datetime, date)):
        return value
    return value


def sqlite_rows(sqlite: sqlite3.Connection) -> dict[str, list[sqlite3.Row]]:
    tables = [row[0] for row in sqlite.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ) if row[0] not in SKIP]
    result: dict[str, list[sqlite3.Row]] = {}
    for source in tables:
        target = TABLE_MAP.get(source, source)
        columns = [row[1] for row in sqlite.execute(f'PRAGMA table_info("{source}")')]
        quoted = ", ".join('"' + column.replace('"', '""') + '"' for column in columns)
        rows = sqlite.execute(f'SELECT {quoted} FROM "{source.replace(chr(34), chr(34) * 2)}"').fetchall()
        result.setdefault(target, []).extend(rows)
    return result


async def neon_columns(pg: asyncpg.Connection) -> dict[str, set[str]]:
    rows = await pg.fetch("""
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
    """)
    result: dict[str, set[str]] = {}
    for row in rows:
        result.setdefault(row["table_name"], set()).add(row["column_name"])
    return result


def target_values(row: sqlite3.Row, target_columns: set[str]) -> tuple[list[str], list[Any]]:
    values: dict[str, Any] = {}
    for source_column in row.keys():
        target_column = COLUMN_MAP.get(source_column, source_column)
        if target_column in target_columns and target_column not in values:
            values[target_column] = normalize(row[source_column], source_column)
    columns = list(values)
    return columns, [values[column] for column in columns]


async def main() -> None:
    args = parse_args()
    if not SOURCE.exists():
        raise FileNotFoundError(f"SQLite não encontrado: {SOURCE}")
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL não está disponível")

    sqlite = sqlite3.connect(SOURCE)
    sqlite.row_factory = sqlite3.Row
    data = sqlite_rows(sqlite)
    pg = await asyncpg.connect(database_url)
    try:
        columns_by_table = await neon_columns(pg)
        missing = sorted(set(data) - set(columns_by_table) - MANAGED_BY_NEON)
        if missing:
            raise RuntimeError(
                "Tabelas ausentes no Neon; aplique as migrations do backend antes de sincronizar: "
                + ", ".join(missing)
            )

        print("Diagnóstico SQLite -> Neon")
        for table in sorted(data):
            print(f"  {table}: {len(data[table])} registros")
        if not args.apply:
            print("Modo diagnóstico: nada foi alterado. Use --apply para substituir os dados.")
            return

        async with pg.transaction():
            existing = set(columns_by_table)
            for table in reversed(PREFERRED_ORDER):
                if table in existing and table in data:
                    await pg.execute(f'DELETE FROM "{table}"')
            for table, rows in data.items():
                if table not in existing or not rows:
                    continue
                target_columns = columns_by_table[table]
                for row in rows:
                    columns, values = target_values(row, target_columns)
                    if not columns:
                        continue
                    quoted = ", ".join(f'"{column}"' for column in columns)
                    placeholders = ", ".join(f'${i}' for i in range(1, len(values) + 1))
                    await pg.execute(
                        f'INSERT INTO "{table}" ({quoted}) VALUES ({placeholders})', *values
                    )
        print("Sincronização concluída com sucesso em uma única transação.")
    finally:
        await pg.close()
        sqlite.close()


if __name__ == "__main__":
    asyncio.run(main())
