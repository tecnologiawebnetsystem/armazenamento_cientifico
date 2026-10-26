from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.api.routes import health
from app.main import app


def test_openapi_exposes_required_operations():
    schema = app.openapi()
    paths = schema["paths"]
    required = {
        "/health",
        "/api/auth/cav4/session",
        "/api/auth/cav4/start",
        "/api/auth/cav4/callback",
        "/api/projects",
        "/api/projects/{project_id}/access-map",
        "/api/folders",
        "/api/audit/logs",
    }
    assert required <= paths.keys()
    assert schema["info"]["title"] == "SIGAC — Sistema de Gestão de Acesso ao Armazenamento Científico API"


def test_health_is_public():
    with TestClient(app) as client:
        response = client.get("/health")
    assert response.status_code in (200, 503)
    assert response.json()["service"] == "fastapi"


def test_protected_operations_keep_expected_methods():
    schema = app.openapi()
    assert "get" in schema["paths"]["/api/projects"]
    assert "post" in schema["paths"]["/api/projects"]
    assert "get" in schema["paths"]["/api/audit/logs"]


def test_health_endpoints_are_registered():
    paths = app.openapi()["paths"]
    assert {"/health", "/health/database"} <= paths.keys()


def test_unknown_route_is_not_silently_accepted():
    with TestClient(app) as client:
        response = client.get("/api/route-that-does-not-exist")
    assert response.status_code == 404


def test_database_config_checks_connection(monkeypatch):
    probe = AsyncMock()
    monkeypatch.setattr(health.db_session, "probe_database_connection", probe)
    diagnostic_app = FastAPI()
    diagnostic_app.include_router(health.router)
    with TestClient(diagnostic_app) as client:
        response = client.get("/api/health/database/config")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["database"] == "connected"
    assert response.json()["database_probe"] == "SELECT 1"
    assert response.json()["error_id"] is None
    probe.assert_awaited_once_with()


@pytest.mark.parametrize(
    "failure",
    [
        OperationalError("SELECT 1", {}, Exception("private-connection-detail")),
        OSError("private-connection-detail"),
        TimeoutError("private-connection-detail"),
        RuntimeError("private-connection-detail"),
    ],
)
def test_database_config_reports_connection_failure(monkeypatch, failure, caplog):
    probe = AsyncMock(side_effect=failure)
    monkeypatch.setattr(health.db_session, "probe_database_connection", probe)
    diagnostic_app = FastAPI()
    diagnostic_app.include_router(health.router)
    with TestClient(diagnostic_app) as client:
        response = client.get("/api/health/database/config")
    assert response.status_code == 503
    assert response.headers["cache-control"] == "no-store"
    payload = response.json()
    assert payload["database"] == "unavailable"
    assert payload["database_probe"] == "SELECT 1"
    assert len(payload["error_id"]) == 12
    assert payload["error_id"] in caplog.text
    assert "private-connection-detail" not in response.text
    probe.assert_awaited_once_with()
