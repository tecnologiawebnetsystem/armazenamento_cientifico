from sqlalchemy import DateTime

import app.db.models  # noqa: F401
from app.db.base import Base

# Colunas deliberadamente sem fuso: a migration 0001 as declara assim.
NAIVE_DATETIME_ALLOWLIST = {
    ("sessions", "expires_at"),
    ("sessions", "created_at"),
}


def test_datetime_columns_are_timezone_aware():
    # O banco usa TIMESTAMP WITH TIME ZONE; o código grava sempre datetime.now(UTC).
    # Uma coluna sem fuso aqui recebe valores com fuso e falha no INSERT.
    naive = [
        f"{table.name}.{column.name}"
        for table in Base.metadata.sorted_tables
        for column in table.columns
        if isinstance(column.type, DateTime)
        and not column.type.timezone
        and (table.name, column.name) not in NAIVE_DATETIME_ALLOWLIST
    ]
    assert not naive, f"Colunas DateTime sem timezone=True fora da lista permitida: {naive}"


def test_allowlist_has_no_stale_entries():
    columns = {(table.name, column.name) for table in Base.metadata.sorted_tables for column in table.columns}
    assert NAIVE_DATETIME_ALLOWLIST <= columns
