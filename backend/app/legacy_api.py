from __future__ import annotations

import csv
import io
import json
import logging
import math
import os
import re
from datetime import UTC, datetime
from typing import Literal
from uuid import uuid4

import aiosqlite
import asyncpg
from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, Field

from app.core.config import settings

logger = logging.getLogger(__name__)

Role = Literal[
    "admin", "gerente", "patrocinador", "auditor", "participante", "visualizador", "gestor"
]
ProjectStatus = Literal["ativo", "concluido", "suspenso"]


def now():
    return datetime.now(UTC)


def dump(row):
    if row is None:
        return None
    d = dict(row)
    for k, v in list(d.items()):
        if isinstance(v, datetime):
            d[k] = v.isoformat()
    return d


def project(row):
    d = dump(row)
    return {
        "id": d["id"],
        "nome": d["name"],
        "codigo": d["code"],
        "areaResponsavel": d["responsible_area"],
        "gestoresIds": d["managers_ids"],
        "grupoAdEscrita": d["write_group"],
        "grupoAdLeitura": d["read_group"],
        "roleIdentidadeEscrita": d["write_identity_role"],
        "roleIdentidadeLeitura": d["read_identity_role"],
        "numeroTarefaSnow": d["snow_task_number"],
        "pastaMae": d["parent_folder"],
        "descricao": d["description"],
        "status": d["status"],
        "criadoEm": d["created_at"],
        "atualizadoEm": d["updated_at"],
        "participantesIds": d["participants_ids"],
        "armazenamentoUsadoMb": 0,
    }


def normalized_role(role: str | None) -> str:
    return {"administrador": "admin", "administrator": "admin"}.get(str(role or "").lower(), str(role or "participante").lower())


def user(row):
    d = dump(row)
    return {
        "id": d["id"],
        "nome": d["name"],
        "email": d["email"],
        "cargo": d["cargo"],
        "area": d["area"],
        "role": normalized_role(d["role"]),
        "criadoEm": d["created_at"],
    }


class Login(BaseModel):
    email: EmailStr


class ProjectInput(BaseModel):
    nome: str = Field(min_length=2, max_length=200)
    codigo: str = Field(min_length=1, max_length=50)
    areaResponsavel: str
    gestoresIds: list[str] = []
    grupoAdEscrita: str = ""
    grupoAdLeitura: str = ""
    roleIdentidadeEscrita: str = ""
    roleIdentidadeLeitura: str = ""
    numeroTarefaSnow: str = ""
    pastaMae: str = ""
    descricao: str = ""
    status: ProjectStatus = "ativo"
    participantesIds: list[str] = []


class ProjectPatch(BaseModel):
    nome: str | None = None
    areaResponsavel: str | None = None
    gestoresIds: list[str] | None = None
    grupoAdEscrita: str | None = None
    grupoAdLeitura: str | None = None
    roleIdentidadeEscrita: str | None = None
    roleIdentidadeLeitura: str | None = None
    numeroTarefaSnow: str | None = None
    pastaMae: str | None = None
    descricao: str | None = None
    status: ProjectStatus | None = None
    participantesIds: list[str] | None = None


class FileInput(BaseModel):
    projectId: str
    parentId: str | None = None
    tipo: Literal["pasta", "arquivo"]
    nome: str = Field(min_length=1, max_length=500)
    tamanho: int = Field(default=0, ge=0)
    mimeType: str | None = None


class FilePatch(BaseModel):
    nome: str | None = None
    parentId: str | None = None


class ShareInput(BaseModel):
    userId: str
    nivel: Literal["leitura", "edicao"]


class MemberInput(BaseModel):
    userId: str
    papel: Literal["gerente", "participante", "visualizador"]


class RolePatch(BaseModel):
    role: Role


class PermissionMatrix(BaseModel):
    matrix: list[dict]


app = FastAPI(
    title="Armazenamento Científico API",
    version="2.0.0",
    description="API REST para gestão de projetos, arquivos, acessos e auditoria.",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)
class SQLitePool:
    """Adaptador mínimo do contrato asyncpg usado pela API legada."""

    def __init__(self, database_url: str):
        path = database_url.split("///", 1)[-1]
        self.path = os.path.abspath(path)
        self.database_url = database_url

    async def close(self):
        return None

    @staticmethod
    def _query(sql: str, args: tuple) -> tuple[str, tuple]:
        # Converte o subconjunto de SQL compartilhado usado pela API para SQLite.
        values = list(args)
        any_pattern = re.compile(r"\$(\d+)=any\(([a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*|[a-zA-Z_][a-zA-Z0-9_]*)\)")

        def replace_any(match):
            index = int(match.group(1)) - 1
            column = match.group(2)
            if index < 0 or index >= len(values):
                raise ValueError(f"Placeholder inválido: ${index + 1}")
            values.insert(index + 1, values[index])
            return f"EXISTS (SELECT 1 FROM json_each({column}) WHERE value=?)"

        sql = any_pattern.sub(replace_any, sql)
        sql = re.sub(r"\$\d+", "?", sql)
        sql = sql.replace("now()", "CURRENT_TIMESTAMP")
        sql = re.sub(r"\bilike\b", "LIKE", sql, flags=re.IGNORECASE)
        sql = re.sub(r"\bis not distinct from\b", "IS", sql, flags=re.IGNORECASE)
        return sql, tuple(values)

    async def fetchrow(self, sql: str, *args):
        query, values = self._query(sql, args)
        async with aiosqlite.connect(self.path) as connection:
            connection.row_factory = aiosqlite.Row
            cursor = await connection.execute(query, values)
            return await cursor.fetchone()

    async def fetch(self, sql: str, *args):
        query, values = self._query(sql, args)
        async with aiosqlite.connect(self.path) as connection:
            connection.row_factory = aiosqlite.Row
            cursor = await connection.execute(query, values)
            return await cursor.fetchall()

    async def fetchval(self, sql: str, *args):
        row = await self.fetchrow(sql, *args)
        return row[0] if row else None

    async def execute(self, sql: str, *args):
        query, values = self._query(sql, args)
        async with aiosqlite.connect(self.path) as connection:
            await connection.execute(query, values)
            await connection.commit()
        return "OK"


pool: asyncpg.Pool | SQLitePool | None = None


@app.on_event("startup")
async def startup():
    global pool
    url = settings.database_url
    logger.info(
        "database_startup engine=%s url_scheme=%s database_url_configured=%s",
        settings.database_engine,
        url.split("://", 1)[0] if url else "none",
        bool(url),
    )
    if settings.database_engine == "sqlite":
        try:
            pool = SQLitePool(url)
            await pool.fetchval("select 1")
            logger.info("database_connected engine=sqlite path=%s", pool.path)
        except Exception:
            pool = None
            logger.exception("database_connection_failed engine=sqlite")
        return
    if url:
        try:
            pool = await asyncpg.create_pool(url, min_size=1, max_size=10, command_timeout=30)
            logger.info("database_connected engine=postgresql")
        except (OSError, asyncpg.PostgresError):
            pool = None
            logger.exception("database_connection_failed engine=postgresql")
    else:
        logger.error("database_not_configured reason=empty_DATABASE_URL")


@app.on_event("shutdown")
async def shutdown():
    if pool:
        await pool.close()


async def db():
    if not pool:
        logger.error(
            "database_unavailable engine=%s configured=%s",
            settings.database_engine,
            bool(settings.database_url),
        )
        raise HTTPException(503, "Banco de dados não configurado")
    return pool


async def database_probe() -> dict:
    """Executa uma consulta real para confirmar que o banco responde."""
    p = await db()
    try:
        result = await p.fetchval("select 1")
        details = {"connected": result == 1, "probe_result": result}
        if isinstance(p, SQLitePool):
            details.update({"path": p.path, "file_exists": os.path.exists(p.path)})
        logger.info("database_probe_success details=%s", details)
        return details
    except Exception:
        logger.exception("database_probe_failed engine=%s", settings.database_engine)
        raise HTTPException(503, "Banco de dados indisponível")


async def current(request: Request):
    sid = request.cookies.get("wayon_session_id")
    if not sid:
        raise HTTPException(401, "Sessão ausente")
    p = await db()
    row = await p.fetchrow(
        "select u.* from sessions s join users u on u.id=s.user_id where s.id=$1 and s.expires_at>now()",
        sid,
    )
    if not row:
        raise HTTPException(401, "Sessão inválida ou expirada")
    return row


async def require(request, roles=()):
    u = await current(request)
    if roles and u["role"] not in roles:
        raise HTTPException(403, "Usuário sem permissão para esta operação")
    return u


async def audit(u, action, entity, eid, details=""):
    p = await db()
    await p.execute(
        "insert into activity_logs(id,user_id,action,entity,entity_id,details,created_at) values($1,$2,$3,$4,$5,$6,now())",
        str(uuid4()),
        u["id"],
        action,
        entity,
        eid,
        details[:4000],
    )


async def visible(u, pid):
    p = await db()
    return await p.fetchrow(
        "select * from projects where id=$1 and ($2 in ('admin','patrocinador','auditor') or $3=any(managers_ids) or $3=any(participants_ids))",
        pid,
        normalized_role(u["role"]),
        u["id"],
    )


@app.get("/health")
async def health():
    ok = bool(pool)
    return {
        "status": "ok" if ok else "degradado",
        "service": "fastapi",
        "version": app.version,
        "database": "connected" if ok else "not_configured",
    }


@app.post("/api/auth/login")
async def login(x: Login, response: Response):
    logger.info("login_attempt email=%s", str(x.email))
    p = await db()
    logger.debug("login_database_selected engine=%s pool_type=%s", settings.database_engine, type(p).__name__)
    try:
        if settings.database_engine == "sqlite":
            u = await p.fetchrow("select * from users where lower(email)=lower(?)", str(x.email))
            expires = "datetime('now', '+8 hours')"
        else:
            u = await p.fetchrow("select * from users where lower(email)=lower($1)", str(x.email))
            expires = "now()+interval '8 hours'"
    except Exception:
        logger.exception("login_user_query_failed engine=%s", settings.database_engine)
        raise HTTPException(503, "Falha ao consultar o banco de dados") from None
    if not u:
        logger.warning("login_rejected reason=user_not_found email=%s", str(x.email))
        raise HTTPException(401, "E-mail não cadastrado")
    logger.info("login_user_found user_id=%s role=%s", u["id"], u["role"])
    sid = str(uuid4())
    try:
        await p.execute(
            f"insert into sessions(id,user_id,expires_at) values($1,$2,{expires})" if settings.database_engine != "sqlite" else "insert into sessions(id,user_id,expires_at) values(?,?,datetime('now', '+8 hours'))",
            sid,
            u["id"],
        )
        logger.info("login_session_created user_id=%s", u["id"])
    except Exception:
        logger.exception("login_session_creation_failed user_id=%s", u["id"])
        raise HTTPException(503, "Falha ao criar sessão no banco de dados") from None
    response.set_cookie(
        "wayon_session_id",
        sid,
        httponly=True,
        samesite="lax",
        secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
        max_age=28800,
    )
    await audit(u, "login", "sessao", sid)
    logger.info("login_success user_id=%s", u["id"])
    return {"user": user(u)}


@app.post("/api/auth/logout", status_code=204)
async def logout(request: Request, response: Response):
    u = await current(request)
    sid = request.cookies.get("wayon_session_id")
    p = await db()
    await p.execute("delete from sessions where id=$1", sid)
    await audit(u, "logout", "sessao", sid)
    response.delete_cookie("wayon_session_id")


@app.get("/api/auth/session")
async def session(request: Request):
    return {"user": user(await current(request))}


@app.get("/api/projects")
async def list_projects(
    request: Request,
    status_filter: str | None = Query(None, alias="status"),
    area: str | None = None,
    nome: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
    all: bool = False,
):
    u = await require(request)
    p = await db()
    q = "select * from projects"
    args = []
    cond = []
    if not (all and u["role"] in ("admin", "patrocinador", "auditor")):
        cond.append(
            "($1 in ('admin','patrocinador','auditor') or $2=any(managers_ids) or $2=any(participants_ids))"
        )
        args = [u["role"], u["id"]]
    if status_filter and status_filter != "todos":
        cond.append(f"status=${len(args) + 1}")
        args.append(status_filter)
    if area:
        cond.append(f"responsible_area=${len(args) + 1}")
        args.append(area)
    if nome:
        cond.append(f"(name ilike ${len(args) + 1} or code ilike ${len(args) + 1})")
        args.append(f"%{nome}%")
    where = (" where " + " and ".join(cond)) if cond else ""
    total = await p.fetchval(f"select count(*) from projects{where}", *args)
    if all:
        rows = await p.fetch(f"{q}{where} order by created_at desc", *args)
        return {"projects": [project(r) for r in rows], "pagination": {"page": 1, "limit": total, "total": total, "totalPages": 1}}
    rows = await p.fetch(f"{q}{where} order by created_at desc limit ${len(args) + 1} offset ${len(args) + 2}", *args, limit, (page - 1) * limit)
    return {"projects": [project(r) for r in rows], "pagination": {"page": page, "limit": limit, "total": total, "totalPages": math.ceil(total / limit) if total else 0}}


@app.post("/api/projects")
async def create_project(x: ProjectInput, request: Request):
    u = await require(request, ("admin", "gerente"))
    p = await db()
    if await p.fetchval("select 1 from projects where code=$1", x.codigo):
        raise HTTPException(409, "Código de projeto já existente")
    i = str(uuid4())
    await p.execute(
        "insert into projects(id,name,code,responsible_area,managers_ids,write_group,read_group,write_identity_role,read_identity_role,snow_task_number,parent_folder,description,status,participants_ids) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)",
        i,
        x.nome,
        x.codigo,
        x.areaResponsavel,
        x.gestoresIds,
        x.grupoAdEscrita,
        x.grupoAdLeitura,
        x.roleIdentidadeEscrita,
        x.roleIdentidadeLeitura,
        x.numeroTarefaSnow,
        x.pastaMae,
        x.descricao,
        x.status,
        x.participantesIds,
    )
    r = await p.fetchrow("select * from projects where id=$1", i)
    await audit(u, "criar-projeto", "projeto", i, x.nome)
    return {"project": project(r)}


@app.get("/api/projects/{pid}")
async def get_project(pid: str, request: Request):
    u = await require(request)
    r = await visible(u, pid)
    if not r:
        raise HTTPException(404, "Projeto não encontrado")
    return {"project": project(r)}


@app.patch("/api/projects/{pid}")
async def patch_project(pid: str, x: ProjectPatch, request: Request):
    u = await require(request, ("admin", "gerente"))
    r = await visible(u, pid)
    if not r:
        raise HTTPException(404, "Projeto não encontrado")
    if u["role"] == "gerente" and u["id"] not in r["managers_ids"]:
        raise HTTPException(403, "Gerente não pertence a este projeto")
    fields = {
        "nome": "name",
        "areaResponsavel": "responsible_area",
        "gestoresIds": "managers_ids",
        "grupoAdEscrita": "write_group",
        "grupoAdLeitura": "read_group",
        "roleIdentidadeEscrita": "write_identity_role",
        "roleIdentidadeLeitura": "read_identity_role",
        "numeroTarefaSnow": "snow_task_number",
        "pastaMae": "parent_folder",
        "descricao": "description",
        "status": "status",
        "participantesIds": "participants_ids",
    }
    vals = x.model_dump(exclude_unset=True)
    p = await db()
    for k, v in vals.items():
        await p.execute(
            f"update projects set {fields[k]}=$1,updated_at=now() where id=$2", v, pid
        )
    r = await p.fetchrow("select * from projects where id=$1", pid)
    await audit(u, "editar-projeto", "projeto", pid, ",".join(vals))
    return {"project": project(r)}


@app.delete("/api/projects/{pid}", status_code=204)
async def delete_project(pid: str, request: Request):
    u = await require(request, ("admin",))
    p = await db()
    r = await p.fetchrow("delete from projects where id=$1 returning *", pid)
    if not r:
        raise HTTPException(404, "Projeto não encontrado")
    await audit(u, "excluir-projeto", "projeto", pid)


@app.get("/api/projects/{pid}/members")
async def members(pid: str, request: Request):
    u = await require(request)
    r = await visible(u, pid)
    if not r:
        raise HTTPException(404, "Projeto não encontrado")
    p = await db()
    rows = await p.fetch(
        "select u.*,m.papel,m.created_at as added_at from project_members m join users u on u.id=m.user_id where m.project_id=$1",
        pid,
    )
    return {
        "members": [
            {
                "projectId": pid,
                "userId": x["id"],
                "papel": x["papel"],
                "adicionadoEm": x["added_at"].isoformat(),
                "user": user(x),
            }
            for x in rows
        ]
    }


@app.post("/api/projects/{pid}/members")
async def add_member(pid: str, x: MemberInput, request: Request):
    u = await require(request, ("admin", "gerente"))
    p = await db()
    if not await visible(u, pid):
        raise HTTPException(404, "Projeto não encontrado")
    if not await p.fetchval("select 1 from users where id=$1", x.userId):
        raise HTTPException(404, "Usuário não encontrado")
    await p.execute(
        "insert into project_members(project_id,user_id,papel) values($1,$2,$3) on conflict(project_id,user_id) do update set papel=excluded.papel",
        pid,
        x.userId,
        x.papel,
    )
    return {"message": "Membro adicionado"}


@app.patch("/api/projects/{pid}/members")
async def patch_member(pid: str, x: MemberInput, request: Request):
    return await add_member(pid, x, request)


@app.delete("/api/projects/{pid}/members")
async def remove_member(pid: str, userId: str, request: Request):
    await require(request, ("admin", "gerente"))
    p = await db()
    await p.execute(
        "delete from project_members where project_id=$1 and user_id=$2", pid, userId
    )


@app.get("/api/files")
async def list_files(
    projectId: str, request: Request, parentId: str | None = None, allFolders: bool = False
):
    u = await require(request)
    if not await visible(u, projectId):
        raise HTTPException(404, "Projeto não encontrado")
    p = await db()
    rows = await p.fetch(
        "select * from files where project_id=$1 and ($2 or parent_id is not distinct from $3) order by kind,name",
        projectId,
        allFolders,
        parentId,
    )
    return {"files": [dump_file(r) for r in rows], "breadcrumb": []}


def dump_file(r):
    d = dump(r)
    return {
        "id": d["id"],
        "projectId": d["project_id"],
        "parentId": d["parent_id"],
        "tipo": d["kind"],
        "nome": d["name"],
        "tamanho": d["size_bytes"],
        "mimeType": d["mime_type"],
        "criadoPor": d["created_by"],
        "criadoEm": d["created_at"],
        "atualizadoEm": d["updated_at"],
        "compartilhamentos": [],
    }


@app.post("/api/files")
async def create_file(x: FileInput, request: Request):
    u = await require(request, ("admin", "gerente", "gestor", "participante"))
    p = await db()
    if not await visible(u, x.projectId):
        raise HTTPException(404, "Projeto não encontrado")
    i = str(uuid4())
    await p.execute(
        "insert into files(id,project_id,parent_id,kind,name,size_bytes,mime_type,created_by) values($1,$2,$3,$4,$5,$6,$7,$8)",
        i,
        x.projectId,
        x.parentId,
        x.tipo,
        x.nome,
        x.tamanho,
        x.mimeType,
        u["id"],
    )
    r = await p.fetchrow("select * from files where id=$1", i)
    await audit(u, "criar-arquivo", "arquivo", i, x.nome)
    return {"file": dump_file(r)}


@app.get("/api/files/{fid}")
async def get_file(fid: str, request: Request):
    u = await require(request)
    p = await db()
    r = await p.fetchrow("select * from files where id=$1", fid)
    if not r or not await visible(u, r["project_id"]):
        raise HTTPException(404, "Arquivo não encontrado")
    return {"file": dump_file(r)}


@app.patch("/api/files/{fid}")
async def patch_file(fid: str, x: FilePatch, request: Request):
    u = await require(request, ("admin", "gerente", "gestor", "participante"))
    p = await db()
    r = await p.fetchrow("select * from files where id=$1", fid)
    if not r or not await visible(u, r["project_id"]):
        raise HTTPException(404, "Arquivo não encontrado")
    vals = x.model_dump(exclude_unset=True)
    for k, v in vals.items():
        await p.execute(
            f"update files set {'name' if k == 'nome' else 'parent_id'}=$1,updated_at=now() where id=$2",
            v,
            fid,
        )
    return {"file": dump_file(await p.fetchrow("select * from files where id=$1", fid))}


@app.delete("/api/files/{fid}", status_code=204)
async def delete_file(fid: str, request: Request):
    u = await require(request, ("admin", "gerente", "gestor", "participante"))
    p = await db()
    r = await p.fetchrow("delete from files where id=$1 returning *", fid)
    if not r:
        raise HTTPException(404, "Arquivo não encontrado")
    await audit(u, "excluir-arquivo", "arquivo", fid, r["name"])


@app.post("/api/files/{fid}/share")
async def share(fid: str, x: ShareInput, request: Request):
    await require(request, ("admin", "gerente"))
    p = await db()
    if not await p.fetchval("select 1 from files where id=$1", fid):
        raise HTTPException(404, "Arquivo não encontrado")
    await p.execute(
        "insert into file_shares(file_id,user_id,level) values($1,$2,$3) on conflict(file_id,user_id) do update set level=excluded.level",
        fid,
        x.userId,
        x.nivel,
    )
    return {"message": "Compartilhamento atualizado"}


@app.delete("/api/files/{fid}/share")
async def unshare(fid: str, userId: str, request: Request):
    await require(request, ("admin", "gerente"))
    p = await db()
    await p.execute("delete from file_shares where file_id=$1 and user_id=$2", fid, userId)


@app.get("/api/users")
async def users(request: Request):
    await require(request, ("admin", "patrocinador", "auditor"))
    p = await db()
    return {"users": [user(r) for r in await p.fetch("select * from users order by name")]}


@app.patch("/api/users/{uid}")
async def user_role(uid: str, x: RolePatch, request: Request):
    await require(request, ("admin",))
    p = await db()
    r = await p.fetchrow("update users set role=$1 where id=$2 returning *", x.role, uid)
    if not r:
        raise HTTPException(404, "Usuário não encontrado")
    return {"user": user(r)}


@app.get("/api/dashboard/summary", tags=["Dashboard"])
async def dashboard_summary(request: Request):
    """Retorna indicadores do dashboard calculados exclusivamente no banco."""
    u = await require(request)
    p = await db()
    role = normalized_role(u["role"])
    if settings.database_engine == "sqlite":
        visibility = "" if role in ("admin", "patrocinador", "auditor") else " where EXISTS (select 1 from json_each(managers_ids) where value=?) or EXISTS (select 1 from json_each(participants_ids) where value=?)"
        args = [] if not visibility else [u["id"], u["id"]]
    else:
        visibility = "" if role in ("admin", "patrocinador", "auditor") else " where $1=any(managers_ids) or $1=any(participants_ids)"
        args = [] if not visibility else [u["id"]]
    logger.info("dashboard_query user_id=%s role=%s engine=%s visibility=%s", u["id"], role, settings.database_engine, "all" if not visibility else "restricted")
    projects = await p.fetch(f"select * from projects{visibility} order by updated_at desc", *args)
    project_ids = [row["id"] for row in projects]
    members = 0
    files = 0
    storage = 0
    if project_ids:
        if settings.database_engine == "sqlite":
            placeholders = ",".join("?" for _ in project_ids)
            members = await p.fetchval(f"select count(distinct user_id) from project_members where project_id in ({placeholders})", *project_ids) or 0
            files = await p.fetchval(f"select count(*) from files where project_id in ({placeholders})", *project_ids) or 0
            storage = await p.fetchval(f"select coalesce(sum(size_bytes), 0) from files where project_id in ({placeholders})", *project_ids) or 0
        else:
            members = await p.fetchval("select count(distinct user_id) from project_members where project_id=any($1::text[])", project_ids) or 0
            files = await p.fetchval("select count(*) from files where project_id=any($1::text[])", project_ids) or 0
            storage = await p.fetchval("select coalesce(sum(size_bytes), 0) from files where project_id=any($1::text[])", project_ids) or 0
    pending = await p.fetchval("select count(*) from access_requests where status='pendente'") if role in ("admin", "patrocinador", "auditor") else 0
    logs = await p.fetch("select * from activity_logs order by created_at desc limit 8")
    return {"projects": [project(row) for row in projects], "totalMembros": int(members), "totalMapas": int(files), "armazenamentoMb": round(int(storage) / 1048576, 2), "pendencias": int(pending or 0), "activity": [dump(row) for row in logs], "source": "database", "consultedAt": now().isoformat()}


@app.get("/api/activity-logs")
async def activity_logs(
    request: Request,
    userId: str | None = None,
    acao: str | None = None,
    entidade: str | None = None,
    search: str | None = None,
    from_: str | None = Query(None, alias="from"),
    to: str | None = None,
):
    await require(request, ("admin", "auditor"))
    p = await db()
    args = []
    c = []
    for col, val in [("user_id", userId), ("action", acao), ("entity", entidade)]:
        if val:
            c.append(f"{col}=${len(args) + 1}")
            args.append(val)
    if search:
        c.append(f"details ilike ${len(args) + 1}")
        args.append(f"%{search}%")
    q = (
        "select * from activity_logs"
        + ((" where " + " and ".join(c)) if c else "")
        + " order by created_at desc limit 1000"
    )
    return {"logs": [dump(r) for r in await p.fetch(q, *args)]}


@app.get("/api/activity-logs/export")
async def export_logs(request: Request, format: Literal["csv", "txt"] = "csv"):
    data = (await activity_logs(request))["logs"]
    out = io.StringIO()
    if format == "csv":
        w = csv.writer(out)
        w.writerow(["data", "usuario", "acao", "entidade", "entidade_id", "detalhes"])
        [
            w.writerow(
                [
                    x.get("created_at"),
                    x.get("user_id"),
                    x.get("action"),
                    x.get("entity"),
                    x.get("entity_id"),
                    x.get("details"),
                ]
            )
            for x in data
        ]
        media = "text/csv"
        name = "auditoria.csv"
    else:
        out.write(
            "\n".join(
                f"{x.get('created_at')} | {x.get('user_id')} | {x.get('action')} | {x.get('entity')}:{x.get('entity_id')} | {x.get('details')}"
                for x in data
            )
        )
        media = "text/plain"
        name = "auditoria.txt"
    return StreamingResponse(
        iter([out.getvalue()]),
        media_type=media,
        headers={"Content-Disposition": f"attachment; filename={name}"},
    )


@app.get("/api/reports")
async def reports(
    request: Request,
    status_filter: str | None = Query(None, alias="status"),
    area: str | None = None,
    projectId: str | None = None,
    search: str | None = None,
):
    u = await require(request)
    p = await db()
    args = []
    conditions = []
    if u["role"] not in ("admin", "patrocinador", "auditor"):
        args.extend([u["id"], u["id"]])
        conditions.append(
            f"(${len(args) - 1}=any(managers_ids) or ${len(args)}=any(participants_ids))"
        )
    if status_filter and status_filter != "todos":
        args.append(status_filter)
        conditions.append(f"status=${len(args)}")
    if area:
        args.append(area)
        conditions.append(f"responsible_area=${len(args)}")
    if projectId:
        args.append(projectId)
        conditions.append(f"id=${len(args)}")
    if search:
        args.append(f"%{search}%")
        conditions.append(
            f"(name ilike ${len(args)} or code ilike ${len(args)} or responsible_area ilike ${len(args)})"
        )
    where = (" where " + " and ".join(conditions)) if conditions else ""
    raw = await p.fetch(f"select * from projects{where} order by created_at desc", *args)
    projects = []
    for item in raw:
        value = project(item)
        value["totalMapas"] = (
            await p.fetchval("select count(*) from files where project_id=$1", item["id"]) or 0
        )
        value["totalMembros"] = (
            await p.fetchval(
                "select count(*) from project_members where project_id=$1", item["id"]
            )
            or 0
        )
        projects.append(value)
    areas = {}
    statuses = {}
    for item in projects:
        areas[item["areaResponsavel"]] = areas.get(item["areaResponsavel"], 0) + 1
        statuses[item["status"]] = statuses.get(item["status"], 0) + 1
    return {
        "filtros": {"status": status_filter or "todos", "area": area, "projectId": projectId},
        "indicadores": {
            "totalProjetos": len(projects),
            "ativos": statuses.get("ativo", 0),
            "suspensos": statuses.get("suspenso", 0),
            "concluidos": statuses.get("concluido", 0),
            "armazenamentoUsadoMb": sum((x.get("armazenamentoUsadoMb") or 0) for x in projects),
            "totalMembros": sum(x["totalMembros"] for x in projects),
            "totalMapas": sum(x["totalMapas"] for x in projects),
        },
        "porArea": [{"area": k, "total": v} for k, v in areas.items()],
        "porStatus": [{"status": k, "total": v} for k, v in statuses.items()],
        "projetos": projects,
    }


@app.get("/api/access-map")
async def access_map(request: Request):
    u = await require(request)
    p = await db()
    if settings.database_engine == "sqlite" and u["role"] not in ("admin", "patrocinador", "auditor"):
        visibility = " where EXISTS (select 1 from json_each(p.managers_ids) where value=?) or EXISTS (select 1 from json_each(p.participants_ids) where value=?)"
        args = [u["id"], u["id"]]
    else:
        visibility = (
            ""
            if u["role"] in ("admin", "patrocinador", "auditor")
            else " where $1=any(p.managers_ids) or $1=any(p.participants_ids)"
        )
        args = [] if not visibility else [u["id"]]
    rows = await p.fetch(
        f"""select u.id as user_id,u.name as user_name,u.email as user_email,u.role as user_role,u.area,p.id as project_id,p.name as project_name,p.status as project_status,f.id as resource_id,f.name as resource_name,f.kind as resource_type,'leitura' as access_level,f.updated_at as last_viewed_at from files f join projects p on p.id=f.project_id left join users u on u.id=f.created_by{visibility} order by f.updated_at desc""",
        *args,
    )
    return {
        "summary": {
            "users": len({x["user_id"] for x in rows if x["user_id"]}),
            "projects": len({x["project_id"] for x in rows}),
            "folders": sum(x["resource_type"] == "pasta" for x in rows),
            "files": sum(x["resource_type"] == "arquivo" for x in rows),
            "relationships": len(rows),
        },
        "rows": [
            {
                "userId": x["user_id"],
                "userName": x["user_name"],
                "userEmail": x["user_email"],
                "userRole": x["user_role"],
                "area": x["area"],
                "projectId": x["project_id"],
                "projectName": x["project_name"],
                "projectStatus": x["project_status"],
                "resourceId": x["resource_id"],
                "resourceName": x["resource_name"],
                "resourceType": x["resource_type"],
                "accessLevel": x["access_level"],
                "lastViewedAt": x["last_viewed_at"].isoformat(),
            }
            for x in rows
        ],
    }


@app.get("/api/access-map/export")
async def export_access_map(
    request: Request,
    format: Literal["csv", "txt", "pdf"] = "csv",
    fields: str = "usuario,email,perfil,area,projeto,recurso,tipo,acesso,ultimaVisualizacao",
    q: str = "",
    type: str = "todos",
    level: str = "todos",
    view: str = "projeto",
):
    if format == "pdf":
        raise HTTPException(422, "Exportação PDF ainda não está disponível no backend")
    data = await access_map(request)
    selected = [item for item in fields.split(",") if item]
    labels = {
        "usuario": ("Usuário", "userName"), "email": ("E-mail", "userEmail"),
        "perfil": ("Perfil", "userRole"), "area": ("Área", "area"),
        "projeto": ("Projeto", "projectName"), "recurso": ("Recurso", "resourceName"),
        "tipo": ("Tipo de recurso", "resourceType"), "acesso": ("Nível de acesso", "accessLevel"),
        "ultimaVisualizacao": ("Última visualização", "lastViewedAt"),
    }
    rows = data["rows"]
    if q:
        needle = q.lower()
        rows = [row for row in rows if needle in " ".join(str(row.get(key, "")) for _, key in labels.values()).lower()]
    if type != "todos":
        rows = [row for row in rows if row.get("resourceType") == type]
    if level != "todos":
        rows = [row for row in rows if row.get("accessLevel") == level]
    out = io.StringIO()
    if format == "csv":
        writer = csv.writer(out)
        writer.writerow([labels[key][0] for key in selected if key in labels])
        for row in rows:
            writer.writerow([row.get(labels[key][1], "") for key in selected if key in labels])
        media, filename = "text/csv", "mapa-de-acessos.csv"
    else:
        out.write("\n".join(" | ".join(str(row.get(labels[key][1], "")) for key in selected if key in labels) for row in rows))
        media, filename = "text/plain", "mapa-de-acessos.txt"
    return StreamingResponse(iter([out.getvalue()]), media_type=media, headers={"Content-Disposition": f"attachment; filename={filename}"})


@app.get("/api/permissions")
async def permissions(request: Request):
    await require(request, ("admin", "auditor"))
    p = await db()
    return {
        "matrix": [
            dump(r) for r in await p.fetch("select * from permissions order by role,resource")
        ]
    }


@app.put("/api/permissions")
async def put_permissions(x: PermissionMatrix, request: Request):
    await require(request, ("admin",))
    p = await db()
    async with p.acquire() as c, c.transaction():
        await c.execute("delete from permissions")
        for item in x.matrix:
            await c.execute(
                "insert into permissions(role,resource,actions) values($1,$2,$3)",
                item["role"],
                item["resource"],
                item.get("actions", []),
            )
    return {"matrix": x.matrix}


@app.get("/api/settings")
async def settings_endpoint(request: Request):
    await require(request, ("admin", "auditor"))
    p = await db()
    return {"settings": {r["key"]: r["value"] for r in await p.fetch("select * from settings")}}


@app.patch("/api/settings")
async def patch_settings(request: Request):
    await require(request, ("admin",))
    values = await request.json()
    p = await db()
    for k, v in values.items():
        await p.execute(
            "insert into settings(key,value) values($1,$2) on conflict(key) do update set value=excluded.value,updated_at=now()",
            k,
            json.dumps(v),
        )
    return {"settings": values}
