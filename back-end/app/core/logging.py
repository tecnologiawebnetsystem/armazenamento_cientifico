from __future__ import annotations

import json
import logging
import os
import sys
from contextvars import ContextVar, Token
from typing import Any

user_id_var: ContextVar[str] = ContextVar("user_id", default="-")
request_id_var: ContextVar[str] = ContextVar("request_id", default="-")


class HumanFormatter(logging.Formatter):
    """Formato compacto para leitura local e troubleshooting no terminal."""

    def format(self, record: logging.LogRecord) -> str:
        timestamp = self.formatTime(record, "%Y-%m-%d %H:%M:%S")
        area = record.name.replace("app.", "")
        user_id = user_id_var.get()
        request_id = request_id_var.get()
        line = f"{timestamp} | {record.levelname:<8} | {area:<28} | {record.getMessage()}"
        line += f" | request_id={request_id}"
        if user_id != "-":
            line += f" | user_id={user_id}"
        if record.exc_info:
            line += f"\n{self.formatException(record.exc_info)}"
        return line


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "user_id": user_id_var.get(),
            "request_id": request_id_var.get(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_logging(level: str = "INFO") -> None:
    handler = logging.StreamHandler(sys.stdout)
    log_format = os.getenv("LOG_FORMAT", "pretty").lower()
    handler.setFormatter(JsonFormatter() if log_format == "json" else HumanFormatter())
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level.upper())


def set_request_context(user_id: str = "-") -> Token[str]:
    return user_id_var.set(user_id)


def set_request_id(request_id: str) -> Token[str]:
    return request_id_var.set(request_id)


def reset_request_id(token: Token[str]) -> None:
    request_id_var.reset(token)


def reset_request_context(token: Token[str]) -> None:
    user_id_var.reset(token)
