import re
import time

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session

router = APIRouter(prefix="/api/sql-manager", tags=["SQL Manager"])
MAX_ROWS = 100
MAX_SQL_LENGTH = 20_000
BLOCKED = re.compile(r"\b(drop|alter|truncate|create|attach|detach|pragma|vacuum|reindex|grant|revoke|copy|call|execute)\b", re.IGNORECASE)


class ExecuteRequest(BaseModel):
    sql: str = Field(min_length=1, max_length=MAX_SQL_LENGTH)


def _clean_sql(sql: str) -> str:
    value = sql.strip().rstrip(";").strip()
    if not value or ";" in value:
        raise HTTPException(400, "Execute apenas uma instrução SQL por vez.")
    if "--" in value or "/*" in value or "*/" in value:
        raise HTTPException(400, "Comentários SQL não são permitidos nesta ferramenta.")
    if BLOCKED.search(value):
        raise HTTPException(403, "Este tipo de comando não é permitido pelo SQL Manager.")
    return value


def _kind(sql: str) -> str:
    match = re.match(r"^([a-z]+)", sql.strip(), re.IGNORECASE)
    return match.group(1).lower() if match else ""


@router.get("/tables")
async def list_tables(session: AsyncSession = Depends(get_session)):
    def read_tables(connection):
        inspector = inspect(connection)
        return [{"name": name, "columns": [{"name": column["name"], "type": str(column["type"])} for column in inspector.get_columns(name)]} for name in sorted(inspector.get_table_names())]

    return {"tables": await session.run_sync(read_tables)}


@router.get("/tables/{table_name}/preview")
async def preview_table(table_name: str, page: int = 1, session: AsyncSession = Depends(get_session)):
    if page < 1 or not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", table_name):
        raise HTTPException(400, "Tabela inválida.")

    def get_table(connection):
        inspector = inspect(connection)
        names = inspector.get_table_names()
        if table_name not in names:
            raise HTTPException(404, "Tabela não encontrada.")
        quoted = connection.dialect.identifier_preparer.quote(table_name)
        columns = [{"name": column["name"], "type": str(column["type"])} for column in inspector.get_columns(table_name)]
        return quoted, columns

    quoted, columns = await session.run_sync(get_table)
    offset = (page - 1) * MAX_ROWS
    result = await session.execute(text(f"SELECT * FROM {quoted} LIMIT :limit OFFSET :offset"), {"limit": MAX_ROWS, "offset": offset})
    rows = [dict(row) for row in result.mappings().all()]
    return {"table": table_name, "columns": columns, "rows": rows, "page": page, "pageSize": MAX_ROWS, "hasMore": len(rows) == MAX_ROWS}


@router.post("/execute")
async def execute_sql(payload: ExecuteRequest, session: AsyncSession = Depends(get_session)):
    sql = _clean_sql(payload.sql)
    kind = _kind(sql)
    if kind not in {"select", "insert", "update", "delete", "with"}:
        raise HTTPException(403, "Apenas SELECT, INSERT, UPDATE e DELETE são permitidos.")
    started = time.perf_counter()
    try:
        result = await session.execute(text(sql))
        if kind in {"select", "with"}:
            rows = [dict(row) for row in result.mappings().fetchmany(MAX_ROWS)]
            columns = list(result.keys())
            await session.rollback()
            return {"kind": "SELECT", "columns": columns, "rows": rows, "rowCount": len(rows), "truncated": len(rows) == MAX_ROWS, "durationMs": round((time.perf_counter() - started) * 1000)}
        affected = result.rowcount if result.rowcount is not None and result.rowcount >= 0 else 0
        await session.commit()
        return {"kind": kind.upper(), "columns": [], "rows": [], "rowCount": affected, "truncated": False, "durationMs": round((time.perf_counter() - started) * 1000)}
    except HTTPException:
        raise
    except Exception as exc:
        await session.rollback()
        raise HTTPException(400, f"Não foi possível executar o SQL: {str(exc)[:240]}") from exc


__all__ = ["router"]
