import csv
import io
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import require_capabilities
from app.db.session import get_session

from .repository import ReportRepository
from .schemas import ReportExportQuery
from .service import ReportService

router = APIRouter(prefix="/api", tags=["Reports"])


def get_service(session: Annotated[AsyncSession, Depends(get_session)]) -> ReportService:
    return ReportService(ReportRepository(session))


@router.get("/report-fields")
async def report_fields(service: Annotated[ReportService, Depends(get_service)], _: Annotated[dict, Depends(require_capabilities("reports"))], report_code: str = Query(min_length=1)):
    return await service.fields(report_code)


@router.get("/reports")
async def reports(service: Annotated[ReportService, Depends(get_service)], _: Annotated[dict, Depends(require_capabilities("reports"))], status: str | None = None, area: str | None = None, gestorId: str | None = None):
    return await service.projects(status, area, gestorId)


@router.get("/reports/export")
async def export_reports(service: Annotated[ReportService, Depends(get_service)], _: Annotated[dict, Depends(require_capabilities("reports"))], query: Annotated[ReportExportQuery, Depends()]):
    rows = await service.rows_for_export(query.report_code, query.status, query.area, query.gestor_id)
    columns = [column.strip() for column in query.fields.split(",") if column.strip()] or (list(rows[0].keys()) if rows else ["id"])
    format_name = query.format.lower()
    if format_name == "pdf":
        buffer = io.BytesIO()
        document = canvas.Canvas(buffer, pagesize=A4)
        _, height = A4
        y = height - 36
        document.setFont("Helvetica-Bold", 10)
        document.drawString(36, y, f"Relatório: {query.report_code}")
        y -= 20
        document.setFont("Helvetica", 7)
        for row in rows:
            line = " | ".join(str(row.get(column, ""))[:70] for column in columns)
            document.drawString(36, y, line[:150])
            y -= 11
            if y < 36:
                document.showPage(); y = height - 36
        document.save(); buffer.seek(0)
        return StreamingResponse(iter([buffer.getvalue()]), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=relatorio-{query.report_code}.pdf"})
    output = io.StringIO()
    if format_name == "csv":
        writer = csv.DictWriter(output, fieldnames=columns, extrasaction="ignore")
        writer.writeheader(); writer.writerows(rows)
        media_type, extension = "text/csv", "csv"
    else:
        output.write("\t".join(columns) + "\n")
        for row in rows: output.write("\t".join(str(row.get(column, "")) for column in columns) + "\n")
        media_type, extension = "text/plain", "txt"
    return StreamingResponse(iter([output.getvalue()]), media_type=media_type, headers={"Content-Disposition": f"attachment; filename=relatorio-{query.report_code}.{extension}"})
