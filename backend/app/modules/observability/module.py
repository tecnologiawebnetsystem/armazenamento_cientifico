from __future__ import annotations

import csv
import io
import json
import os
import re
import threading
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/observabilidade", tags=["Observabilidade"])
LOG_PATH = Path(os.getenv("OBSERVABILITY_LOG_PATH", "./data/observability.jsonl"))
MAX_BYTES = 8 * 1024 * 1024
MAX_EVENTS = 2000
_lock = threading.Lock()
_SECRET = re.compile(r"(?i)(authorization|cookie|token|password|secret)=?[^&\s]*")


def sanitize(value: Any) -> Any:
    if isinstance(value, str):
        return _SECRET.sub(r"\1=[redacted]", value)[:1200]
    if isinstance(value, dict):
        return {str(k): sanitize(v) for k, v in list(value.items())[:30]}
    if isinstance(value, list):
        return [sanitize(v) for v in value[:30]]
    return value


def append_event(event: dict[str, Any]) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {"timestamp": datetime.now(UTC).isoformat(), **sanitize(event)}
    with _lock:
        with LOG_PATH.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(payload, ensure_ascii=False) + "\n")
        if LOG_PATH.stat().st_size > MAX_BYTES:
            lines = LOG_PATH.read_text(encoding="utf-8").splitlines()[-MAX_EVENTS:]
            LOG_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def read_events() -> list[dict[str, Any]]:
    if not LOG_PATH.exists():
        return []
    with _lock:
        lines = LOG_PATH.read_text(encoding="utf-8").splitlines()[-MAX_EVENTS:]
    result = []
    for line in reversed(lines):
        try:
            result.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return result


def is_observability_event(event: dict[str, Any]) -> bool:
    endpoint = str(event.get("endpoint") or "").lower()
    message = str(event.get("message") or "").lower()
    return endpoint.startswith("/api/observabilidade") or "/api/observabilidade" in message


class FrontendEvent(BaseModel):
    level: str = "info"
    message: str = Field(min_length=1, max_length=1200)
    endpoint: str | None = None
    status: int | None = None
    duration_ms: float | None = None
    correlation_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


def filtered_events(source: str | None, status: int | None, level: str | None, search: str | None, endpoint: str | None) -> list[dict[str, Any]]:
    items = [item for item in read_events() if not is_observability_event(item)]
    if source:
        items = [item for item in items if item.get("source") == source]
    if status is not None:
        items = [item for item in items if item.get("status") == status]
    if level:
        items = [item for item in items if str(item.get("level", "")).lower() == level.lower()]
    if endpoint:
        items = [item for item in items if endpoint.lower() in str(item.get("endpoint") or "").lower()]
    if search:
        needle = search.lower()
        items = [item for item in items if needle in json.dumps(item, ensure_ascii=False).lower()]
    return items


def event_duration(item: dict[str, Any]) -> float | None:
    value = item.get("duration_ms", item.get("metadata", {}).get("duration_ms"))
    return float(value) if isinstance(value, (int, float)) else None


@router.get("/events")
async def events(limit: int = Query(default=250, ge=1, le=500), page: int = Query(default=1, ge=1), source: str | None = None, status: int | None = None, level: str | None = None, search: str | None = None, endpoint: str | None = None):
    items = filtered_events(source, status, level, search, endpoint)
    durations = sorted(d for item in items if (d := event_duration(item)) is not None)
    errors = [i for i in items if str(i.get("level", "")).lower() in {"error", "critical"} or (isinstance(i.get("status"), int) and i["status"] >= 400)]
    latency = {"average": round(sum(durations) / len(durations)) if durations else 0, "p50": round(durations[len(durations) // 2]) if durations else 0, "p95": round(durations[min(len(durations) - 1, int(len(durations) * .95))]) if durations else 0}
    groups: dict[str, int] = {}
    for item in items:
        key = item.get("correlation_id") or item.get("metadata", {}).get("correlation_id")
        if key:
            groups[str(key)] = groups.get(str(key), 0) + 1
    pages = max(1, (len(items) + limit - 1) // limit)
    start = (page - 1) * limit
    return {"events": items[start:start + limit], "stats": {"total": len(items), "errors": len(errors), "frontend": sum(i.get("source") == "frontend" for i in items), "backend": sum(i.get("source") == "backend" for i in items), "error_rate": round(len(errors) / len(items) * 100, 1) if items else 0, "latency": latency, "correlated_groups": len(groups)}, "pagination": {"page": page, "limit": limit, "total_pages": pages}}


@router.get("/export")
async def export_events(format: str = Query(default="json", pattern="^(json|csv)$"), source: str | None = None, status: int | None = None, level: str | None = None, search: str | None = None, endpoint: str | None = None):
    items = filtered_events(source, status, level, search, endpoint)
    if format == "json":
        content = json.dumps(items, ensure_ascii=False, indent=2)
        media = "application/json"
    else:
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["timestamp", "source", "level", "message", "endpoint", "status", "duration_ms", "correlation_id"])
        writer.writeheader()
        for item in items:
            writer.writerow({key: item.get(key, item.get("metadata", {}).get(key, "")) for key in writer.fieldnames})
        content, media = output.getvalue(), "text/csv"
    return StreamingResponse(iter([content]), media_type=media, headers={"Content-Disposition": f"attachment; filename=observabilidade.{format}"})


@router.post("/events", status_code=202)
async def ingest(event: FrontendEvent, request: Request):
    if os.getenv("ENVIRONMENT", "development").lower() == "production":
        raise HTTPException(status_code=403, detail="Ingestão aberta desabilitada em produção")
    append_event({"source": "frontend", "client_ip": request.client.host if request.client else "-", **event.model_dump()})
    return {"accepted": True}


def record_backend(**event: Any) -> None:
    append_event({"source": "backend", **event})


@router.get("/health")
async def health():
    items = filtered_events(None, None, None, None, None)
    errors = sum(str(i.get("level", "")).lower() in {"error", "critical"} or (isinstance(i.get("status"), int) and i["status"] >= 400) for i in items)
    return {"healthy": not items or errors / len(items) < .1, "errors": errors, "total": len(items)}


@router.get("/correlations/{correlation_id}")
async def correlation(correlation_id: str):
    items = [i for i in filtered_events(None, None, None, None, None) if str(i.get("correlation_id") or i.get("metadata", {}).get("correlation_id") or "") == correlation_id]
    return {"correlation_id": correlation_id, "events": items}


__all__ = ["record_backend", "router"]
