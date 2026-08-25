from __future__ import annotations

import json
import logging
import sys
from contextvars import ContextVar
from typing import Any

correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="-")
user_id_var: ContextVar[str] = ContextVar("user_id", default="-")


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "correlation_id": correlation_id_var.get(),
            "user_id": user_id_var.get(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_logging(level: str = "INFO") -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level.upper())


def set_request_context(correlation_id: str, user_id: str = "-") -> None:
    correlation_id_var.set(correlation_id)
    user_id_var.set(user_id)
