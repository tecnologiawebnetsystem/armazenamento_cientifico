from __future__ import annotations

import asyncio
import json
import os
import sqlite3
from datetime import datetime
from pathlib import Path

import asyncpg

SOURCE = Path(__file__).resolve().parents[1] / "data" / "sigac.db"
TABLES = {
    "perfis": "profiles",
    "users": "users",
    "modulos": "modules",
    "permissoes": "permissions",
    "perfil_permissoes": "profile_permissions",
    "perfil_modulos": "profile_modules",
    "status_projetos": "project_statuses",
    "tipos_projetos": "project_types",
    "configuracoes_sistema": "system_settings",
    "tipos_relatorios": "report_types",
    "menus": "menus",
    "projects": "projects",
    "project_members": "project_members",
    "files": "files",
    "file_shares": "file_shares",
    "file_permissions": "file_permissions",
    "access_requests": "access_requests",
    "activity_logs": "activity_logs",
    "sessions": "sessions",
    "permission_matrix": "permission_matrix",
}
COLUMN_MAP = {
    "nome": "name", "descricao": "description", "criado_em": "created_at",
    "cargo": "job_title", "perfil_id": "profile_id", "modulo_id": "module_id",
    "permissao_id": "permission_id", "permitido": "allowed", "pode_visualizar": "can_view",
    "codigo": "code", "cor": "color", "ordem": "display_order", "ativo": "active",
    "rota": "route", "icone": "icon", "permite_edicao": "allows_edit",
    "permite_edicao": "allows_edit", "chave": "key", "valor": "value",
    "tipo": "value_type", "grupo": "group_name", "formatos": "formats",
    "papel": "role", "level": "access_level",
}
SKIP = {"alembic_version", "settings"}


def normalize(value, column):
    if isinstance(value, bytes):
        return value.decode("utf-8")
    if isinstance(value, (list, dict)):
        return json.dumps(value)
    if value is None:
        return None
    if column in {"ativo", "permitido", "pode_visualizar", "permite_edicao"}:
        return bool(value)
    if column.endswith("_at") or column in {"criado_em", "created_at", "updated_at", "expires_at"}:
        if isinstance(value, str):
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
    if isinstance(value, str) and value.startswith(("[", "{")):
        try:
            parsed = json.loads(value)
            return json.dumps(parsed) if isinstance(parsed, (list, dict)) else parsed
        except json.JSONDecodeError:
            return value
    return value


async def main() -> None:
    if not os.getenv("DATABASE_URL"):
        raise RuntimeError("DATABASE_URL não está disponível")
    sqlite = sqlite3.connect(SOURCE)
    sqlite.row_factory = sqlite3.Row
    pg = await asyncpg.connect(os.environ["DATABASE_URL"])
    migrated = 0
    try:
        for source, target in TABLES.items():
            columns = [row[1] for row in sqlite.execute(f'PRAGMA table_info("{source}")')]
            target_columns = [COLUMN_MAP.get(column, column) for column in columns]
            rows = sqlite.execute(f'SELECT {", ".join(columns)} FROM "{source}"').fetchall()
            if not rows:
                continue
            quoted_columns = ", ".join(f'"{column}"' for column in target_columns)
            placeholders = ", ".join(f'${index}' for index in range(1, len(columns) + 1))
            query = f'INSERT INTO "{target}" ({quoted_columns}) VALUES ({placeholders}) ON CONFLICT DO NOTHING'
            for row in rows:
                await pg.execute(query, *(normalize(row[column], column) for column in columns))
                migrated += 1
            print(f"{source} -> {target}: {len(rows)} registros")
        await pg.execute("INSERT INTO schema_migrations(version) VALUES ('0003_sqlite_data_migration') ON CONFLICT DO NOTHING")
        print(f"Total migrado: {migrated} registros")
    finally:
        await pg.close()
        sqlite.close()


if __name__ == "__main__":
    asyncio.run(main())
