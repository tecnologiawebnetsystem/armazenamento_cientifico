import csv
import io
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import CurrentUser
from app.db.session import get_session

from .repository import ReportRepository
from .schemas import ReportExportQuery
from .service import ReportService

router = APIRouter(prefix="/api", tags=["Reports"])


def get_service(session: Annotated[AsyncSession, Depends(get_session)]) -> ReportService:
    return ReportService(ReportRepository(session))


@router.get("/report-fields")
async def report_fields(service: Annotated[ReportService, Depends(get_service)], _: CurrentUser, report_code: str = Query(min_length=1)):
    return await service.fields(report_code)


@router.get("/reports")
async def reports(service: Annotated[ReportService, Depends(get_service)], _: CurrentUser, status: str | None = None, area: str | None = None, gestorId: str | None = None):
    return await service.projects(status, area, gestorId)


@router.get("/reports/export")
async def export_reports(service: Annotated[ReportService, Depends(get_service)], _: CurrentUser, query: Annotated[ReportExportQuery, Depends()]):
    report = await service.projects(query.status, query.area, query.gestor_id)
    rows = report["projetos"]
    output = io.StringIO()
    columns = [column for column in query.fields.split(",") if column] or (list(rows[0].keys()) if rows else ["id", "nome", "status"])
    writer = csv.DictWriter(output, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv" if query.format == "csv" else "text/plain", headers={"Content-Disposition": "attachment; filename=relatorio-projetos.csv"})
