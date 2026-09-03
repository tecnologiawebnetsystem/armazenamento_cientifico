from __future__ import annotations

import json
import os
import re
import threading
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request
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


def read_events(limit: int = 250) -> list[dict[str, Any]]:
    if not LOG_PATH.exists():
        return []
    with _lock:
        lines = LOG_PATH.read_text(encoding="utf-8").splitlines()[-min(limit, MAX_EVENTS):]
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
    metadata: dict[str, Any] = Field(default_factory=dict)


@router.get("/events")
async def events(limit: int = Query(default=250, ge=1, le=500), source: str | None = None, status: int | None = None, level: str | None = None, search: str | None = None):
    items = [item for item in read_events(limit=MAX_EVENTS) if not is_observability_event(item)]
    # Filtra depois de carregar o histórico completo, para não perder eventos
    # quando a origem/status solicitado não aparece nas últimas N linhas.
    if source:
        items = [item for item in items if item.get("source") == source]
    if status is not None:
        items = [item for item in items if item.get("status") == status]
    if level:
        items = [item for item in items if str(item.get("level", "")).lower() == level.lower()]
    if search:
        needle = search.lower()
        items = [item for item in items if needle in json.dumps(item, ensure_ascii=False).lower()]
    counts = {"total": len(items), "errors": sum(1 for i in items if str(i.get("level", "")).lower() in {"error", "critical"}), "frontend": sum(1 for i in items if i.get("source") == "frontend"), "backend": sum(1 for i in items if i.get("source") == "backend")}
    return {"events": items[:limit], "stats": counts}


@router.post("/events", status_code=202)
async def ingest(event: FrontendEvent, request: Request):
    if os.getenv("ENVIRONMENT", "development").lower() == "production":
        raise HTTPException(status_code=403, detail="Ingestão aberta desabilitada em produção")
    append_event({"source": "frontend", "client_ip": request.client.host if request.client else "-", **event.model_dump()})
    return {"accepted": True}


def record_backend(**event: Any) -> None:
    append_event({"source": "backend", **event})
