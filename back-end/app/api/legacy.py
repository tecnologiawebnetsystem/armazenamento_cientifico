"""Boundary adapter for the legacy API during the modular migration.

This module keeps legacy startup/shutdown and mounting concerns outside the
application factory. New domains must be exposed through routers and must not
import this adapter.
"""

from typing import Any

from fastapi import FastAPI

from app.legacy_api import app as legacy_app
from app.legacy_api import shutdown as legacy_shutdown
from app.legacy_api import startup as legacy_startup


async def startup() -> None:
    await legacy_startup()


async def shutdown() -> None:
    await legacy_shutdown()


def mount_legacy(application: FastAPI) -> None:
    """Mount compatibility routes while the domain migration is in progress."""
    application.mount("/", legacy_app)


def legacy_openapi() -> dict[str, Any]:
    return legacy_app.openapi()


__all__ = ["legacy_openapi", "mount_legacy", "shutdown", "startup"]
