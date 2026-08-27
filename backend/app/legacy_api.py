from __future__ import annotations

import csv
import io
import json
import os
from datetime import UTC, datetime
from typing import Literal
from uuid import uuid4

import asyncpg
from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, Field

from app.core.config import settings

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


def user(row):
    d = dump(row)
    return {
        "id": d["id"],
        "nome": d["name"],
        "email": d["email"],
        "cargo": d["cargo"],
        "area": d["area"],
        "role": d["role"],
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
pool: asyncpg.Pool | None = None


@app.on_event("startup")
async def startup():
    global pool
    url = os.getenv("DATABASE_URL")
    if url:
        try:
            pool = await asyncpg.create_pool(url, min_size=1, max_size=10, command_timeout=30)
        except (OSError, asyncpg.PostgresError):
            pool = None


@app.on_event("shutdown")
async def shutdown():
    if pool:
        await pool.close()


async def db():
    if not pool:
        raise HTTPException(503, "Banco de dados não configurado")
    return pool


async def current(request: Request):
    sid = request.cookies.get("wayon_session_id")
    if not sid:
        raise HTTPException(401, "Sessão ausente")
    p = await db()
    row = await p.fetchrow(
        "select u.* from app_sessions s join app_users u on u.id=s.user_id where s.id=$1 and s.expires_at>now()",
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
        "insert into app_activity_logs(id,user_id,action,entity,entity_id,details,created_at) values($1,$2,$3,$4,$5,$6,now())",
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
        "select * from app_projects where id=$1 and ($2 in ('admin','patrocinador','auditor') or $3=any(managers_ids) or $3=any(participants_ids))",
        pid,
        u["role"],
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
    p = await db()
    if settings.database_engine == "sqlite":
        u = await p.fetchrow("select * from app_users where lower(email)=lower(?)", str(x.email))
        expires = "datetime('now', '+8 hours')"
    else:
        u = await p.fetchrow("select * from app_users where lower(email)=lower($1)", str(x.email))
        expires = "now()+interval '8 hours'"
    if not u:
        raise HTTPException(401, "E-mail não cadastrado")
    sid = str(uuid4())
    await p.execute(
        f"insert into app_sessions(id,user_id,expires_at) values($1,$2,{expires})" if settings.database_engine != "sqlite" else "insert into app_sessions(id,user_id,expires_at) values(?,?,datetime('now', '+8 hours'))",
        sid,
        u["id"],
    )
    response.set_cookie(
        "wayon_session_id",
        sid,
        httponly=True,
        samesite="lax",
        secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
        max_age=28800,
    )
    await audit(u, "login", "sessao", sid)
    return {"user": user(u)}


@app.post("/api/auth/logout", status_code=204)
async def logout(request: Request, response: Response):
    u = await current(request)
    sid = request.cookies.get("wayon_session_id")
    p = await db()
    await p.execute("delete from app_sessions where id=$1", sid)
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
    all: bool = False,
):
    u = await require(request)
    p = await db()
    q = "select * from app_projects"
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
    if cond:
        q += " where " + " and ".join(cond)
    return {"projects": [project(r) for r in await p.fetch(q, *args)]}


@app.post("/api/projects")
async def create_project(x: ProjectInput, request: Request):
    u = await require(request, ("admin", "gerente"))
    p = await db()
    if await p.fetchval("select 1 from app_projects where code=$1", x.codigo):
        raise HTTPException(409, "Código de projeto já existente")
    i = str(uuid4())
    await p.execute(
        "insert into app_projects(id,name,code,responsible_area,managers_ids,write_group,read_group,write_identity_role,read_identity_role,snow_task_number,parent_folder,description,status,participants_ids) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)",
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
    r = await p.fetchrow("select * from app_projects where id=$1", i)
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
            f"update app_projects set {fields[k]}=$1,updated_at=now() where id=$2", v, pid
        )
    r = await p.fetchrow("select * from app_projects where id=$1", pid)
    await audit(u, "editar-projeto", "projeto", pid, ",".join(vals))
    return {"project": project(r)}


@app.delete("/api/projects/{pid}", status_code=204)
async def delete_project(pid: str, request: Request):
    u = await require(request, ("admin",))
    p = await db()
    r = await p.fetchrow("delete from app_projects where id=$1 returning *", pid)
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
        "select u.*,m.papel,m.created_at as added_at from app_project_members m join app_users u on u.id=m.user_id where m.project_id=$1",
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
    if not await p.fetchval("select 1 from app_users where id=$1", x.userId):
        raise HTTPException(404, "Usuário não encontrado")
    await p.execute(
        "insert into app_project_members(project_id,user_id,papel) values($1,$2,$3) on conflict(project_id,user_id) do update set papel=excluded.papel",
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
        "delete from app_project_members where project_id=$1 and user_id=$2", pid, userId
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
        "select * from app_files where project_id=$1 and ($2 or parent_id is not distinct from $3) order by kind,name",
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
        "insert into app_files(id,project_id,parent_id,kind,name,size_bytes,mime_type,created_by) values($1,$2,$3,$4,$5,$6,$7,$8)",
        i,
        x.projectId,
        x.parentId,
        x.tipo,
        x.nome,
        x.tamanho,
        x.mimeType,
        u["id"],
    )
    r = await p.fetchrow("select * from app_files where id=$1", i)
    await audit(u, "criar-arquivo", "arquivo", i, x.nome)
    return {"file": dump_file(r)}


@app.get("/api/files/{fid}")
async def get_file(fid: str, request: Request):
    u = await require(request)
    p = await db()
    r = await p.fetchrow("select * from app_files where id=$1", fid)
    if not r or not await visible(u, r["project_id"]):
        raise HTTPException(404, "Arquivo não encontrado")
    return {"file": dump_file(r)}


@app.patch("/api/files/{fid}")
async def patch_file(fid: str, x: FilePatch, request: Request):
    u = await require(request, ("admin", "gerente", "gestor", "participante"))
    p = await db()
    r = await p.fetchrow("select * from app_files where id=$1", fid)
    if not r or not await visible(u, r["project_id"]):
        raise HTTPException(404, "Arquivo não encontrado")
    vals = x.model_dump(exclude_unset=True)
    for k, v in vals.items():
        await p.execute(
            f"update app_files set {'name' if k == 'nome' else 'parent_id'}=$1,updated_at=now() where id=$2",
            v,
            fid,
        )
    return {"file": dump_file(await p.fetchrow("select * from app_files where id=$1", fid))}


@app.delete("/api/files/{fid}", status_code=204)
async def delete_file(fid: str, request: Request):
    u = await require(request, ("admin", "gerente", "gestor", "participante"))
    p = await db()
    r = await p.fetchrow("delete from app_files where id=$1 returning *", fid)
    if not r:
        raise HTTPException(404, "Arquivo não encontrado")
    await audit(u, "excluir-arquivo", "arquivo", fid, r["name"])


@app.post("/api/files/{fid}/share")
async def share(fid: str, x: ShareInput, request: Request):
    await require(request, ("admin", "gerente"))
    p = await db()
    if not await p.fetchval("select 1 from app_files where id=$1", fid):
        raise HTTPException(404, "Arquivo não encontrado")
    await p.execute(
        "insert into app_file_shares(file_id,user_id,level) values($1,$2,$3) on conflict(file_id,user_id) do update set level=excluded.level",
        fid,
        x.userId,
        x.nivel,
    )
    return {"message": "Compartilhamento atualizado"}


@app.delete("/api/files/{fid}/share")
async def unshare(fid: str, userId: str, request: Request):
    await require(request, ("admin", "gerente"))
    p = await db()
    await p.execute("delete from app_file_shares where file_id=$1 and user_id=$2", fid, userId)


@app.get("/api/users")
async def users(request: Request):
    await require(request, ("admin", "patrocinador", "auditor"))
    p = await db()
    return {"users": [user(r) for r in await p.fetch("select * from app_users order by name")]}


@app.patch("/api/users/{uid}")
async def user_role(uid: str, x: RolePatch, request: Request):
    await require(request, ("admin",))
    p = await db()
    r = await p.fetchrow("update app_users set role=$1 where id=$2 returning *", x.role, uid)
    if not r:
        raise HTTPException(404, "Usuário não encontrado")
    return {"user": user(r)}


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
        "select * from app_activity_logs"
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
    raw = await p.fetch(f"select * from app_projects{where} order by created_at desc", *args)
    projects = []
    for item in raw:
        value = project(item)
        value["totalMapas"] = (
            await p.fetchval("select count(*) from app_files where project_id=$1", item["id"]) or 0
        )
        value["totalMembros"] = (
            await p.fetchval(
                "select count(*) from app_project_members where project_id=$1", item["id"]
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
    visibility = (
        ""
        if u["role"] in ("admin", "patrocinador", "auditor")
        else " where $1=any(p.managers_ids) or $1=any(p.participants_ids)"
    )
    args = [] if not visibility else [u["id"]]
    rows = await p.fetch(
        f"""select u.id as user_id,u.name as user_name,u.email as user_email,u.role as user_role,u.area,p.id as project_id,p.name as project_name,p.status as project_status,f.id as resource_id,f.name as resource_name,f.kind as resource_type,'leitura' as access_level,f.updated_at as last_viewed_at from app_files f join app_projects p on p.id=f.project_id left join app_users u on u.id=f.created_by{visibility} order by f.updated_at desc""",
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


@app.get("/api/permissions")
async def permissions(request: Request):
    await require(request, ("admin", "auditor"))
    p = await db()
    return {
        "matrix": [
            dump(r) for r in await p.fetch("select * from app_permissions order by role,resource")
        ]
    }


@app.put("/api/permissions")
async def put_permissions(x: PermissionMatrix, request: Request):
    await require(request, ("admin",))
    p = await db()
    async with p.acquire() as c, c.transaction():
        await c.execute("delete from app_permissions")
        for item in x.matrix:
            await c.execute(
                "insert into app_permissions(role,resource,actions) values($1,$2,$3)",
                item["role"],
                item["resource"],
                item.get("actions", []),
            )
    return {"matrix": x.matrix}


@app.get("/api/settings")
async def settings(request: Request):
    await require(request, ("admin", "auditor"))
    p = await db()
    return {"settings": {r["key"]: r["value"] for r in await p.fetch("select * from app_settings")}}


@app.patch("/api/settings")
async def patch_settings(request: Request):
    await require(request, ("admin",))
    values = await request.json()
    p = await db()
    for k, v in values.items():
        await p.execute(
            "insert into app_settings(key,value) values($1,$2) on conflict(key) do update set value=excluded.value,updated_at=now()",
            k,
            json.dumps(v),
        )
    return {"settings": values}
