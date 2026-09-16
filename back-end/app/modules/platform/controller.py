import csv
import io
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import CurrentUser
from app.db.session import get_session

from .repository import PlatformRepository
from .service import PlatformService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Platform"])


def service_dependency(session: Annotated[AsyncSession, Depends(get_session)]) -> PlatformService:
    return PlatformService(PlatformRepository(session))


Service = Annotated[PlatformService, Depends(service_dependency)]


@router.get("/catalogos")
async def catalogs(service: Service, _: CurrentUser):
    logger.info("platform_catalogs_read")
    return await service.catalogs()


@router.get("/users")
async def users(service: Service, _: CurrentUser):
    logger.info("platform_users_read")
    return {"users": await service.users()}


@router.get("/folders")
async def folders(service: Service, _: CurrentUser, projectId: str = Query(min_length=1)):
    logger.info("platform_folders_read project_id=%s", projectId)
    return await service.folders(projectId)


@router.get("/dashboard/summary")
async def dashboard(service: Service, _: CurrentUser):
    logger.info("platform_dashboard_read")
    return await service.dashboard()


@router.get("/access-requests")
async def access_requests(service: Service, _: CurrentUser):
    logger.info("platform_access_requests_read")
    return await service.access_requests()


@router.post("/access-requests", status_code=201)
async def create_access_request(payload: dict, service: Service, user: CurrentUser):
    logger.info("platform_access_request_create user_id=%s", user["id"])
    return await service.create_access_request(user["id"], payload)


@router.patch("/access-requests/{request_id}")
async def update_access_request(request_id: str, payload: dict, service: Service, user: CurrentUser):
    logger.info("platform_access_request_update request_id=%s user_id=%s", request_id, user["id"])
    return await service.update_access_request(request_id, payload["status"], user["id"])


@router.get("/permissions")
async def permissions(service: Service, _: CurrentUser):
    return await service.permission_matrix()


@router.put("/permissions")
async def update_permissions(payload: dict, service: Service, _: CurrentUser):
    logger.info("platform_permissions_update")
    for entry in payload.get("matrix", []):
        await service.repository.execute("update permission_matrix set can_view_projects = :verProjetos, can_create_projects = :criarProjetos, can_edit_projects = :editarProjeto, can_delete_projects = :excluirProjeto, can_manage_members = :gerenciarMembros, can_upload_files = :uploadArquivos, can_delete_files = :excluirArquivos, can_approve_requests = :aprovarSolicitacoes where role = :papel", {**entry, "papel": entry.get("papel") or entry.get("role")})
    return await service.permission_matrix()


@router.get("/settings")
async def settings(service: Service, _: CurrentUser):
    return await service.settings()


@router.patch("/settings")
async def update_settings(payload: dict, service: Service, _: CurrentUser):
    logger.info("platform_settings_update keys=%s", sorted(payload.keys()))
    return await service.update_settings(payload)


@router.get("/activity-logs")
async def activity_logs(service: Service, _: CurrentUser, page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=500)):
    logger.info("platform_activity_logs_read page=%s limit=%s", page, limit)
    return await service.activity_logs(page, limit)


@router.get("/access-map")
async def access_map(service: Service, _: CurrentUser):
    logger.info("platform_access_map_read")
    return await service.access_map()


@router.get("/report-fields")
async def report_fields(service: Service, _: CurrentUser, report_code: str = Query(min_length=1)):
    rows = await service.repository.rows("select id, report_code, field_key, label, source_key, display_order, active from report_fields where report_code = :report_code and active = true order by display_order", {"report_code": report_code})
    return {"reportCode": report_code, "fields": rows}


@router.get("/access-map/export")
async def export_access_map(service: Service, _: CurrentUser, format: str = Query("csv"), fields: str = ""):
    data = await service.access_map()
    output = io.StringIO()
    rows = data.get("rows", [])
    columns = [column for column in fields.split(",") if column] or (list(rows[0].keys()) if rows else ["userId", "projectId", "resourceId"])
    writer = csv.DictWriter(output, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)
    media_type = "text/csv" if format == "csv" else "text/plain"
    return StreamingResponse(iter([output.getvalue()]), media_type=media_type, headers={"Content-Disposition": "attachment; filename=mapa-de-acessos.csv"})


@router.get("/reports")
async def reports(service: Service, _: CurrentUser, status: str | None = None, area: str | None = None, gestorId: str | None = None):
    filters = {"status": status or "todos", "area": area, "gestorId": gestorId}
    rows = await service.repository.rows("select p.id, p.name as nome, p.code as codigo, p.responsible_area as \"areaResponsavel\", p.status, p.description as descricao, p.created_at as \"criadoEm\", p.updated_at as \"atualizadoEm\", 0 as \"totalMapas\", 0 as \"totalMembros\" from projects p where (:status is null or p.status = :status) and (:area is null or p.responsible_area = :area) order by p.name", {"status": status, "area": area})
    by_status = await service.repository.rows("select status, count(*) as total from projects group by status")
    return {"filtros": filters, "indicadores": {"totalProjetos": len(rows), "ativos": sum(r["status"] in ("ativo", "em_andamento") for r in rows), "suspensos": sum(r["status"] == "suspenso" for r in rows), "concluidos": sum(r["status"] == "concluido" for r in rows), "armazenamentoUsadoMb": 0, "totalMembros": 0, "totalMapas": 0}, "porArea": [], "porStatus": by_status, "projetos": rows}


@router.get("/reports/export")
async def export_reports(service: Service, _: CurrentUser, format: str = Query("csv"), fields: str = "", status: str | None = None, area: str | None = None, gestorId: str | None = None):
    report = await reports(service, _, status, area, gestorId)
    rows = report["projetos"]
    output = io.StringIO()
    columns = [column for column in fields.split(",") if column] or (list(rows[0].keys()) if rows else ["id", "nome", "status"])
    writer = csv.DictWriter(output, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv" if format == "csv" else "text/plain", headers={"Content-Disposition": "attachment; filename=relatorio-projetos.csv"})
