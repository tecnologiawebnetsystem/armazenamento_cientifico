from fastapi.testclient import TestClient

from app.main import app


def test_openapi_exposes_required_operations():
    schema = app.openapi()
    paths = schema["paths"]
    required = {
        "/health",
        "/api/auth/login",
        "/api/auth/logout",
        "/api/auth/session",
        "/api/projects",
        "/api/files",
        "/api/users",
        "/api/reports",
        "/api/access-map",
        "/api/permissions",
        "/api/settings",
        "/api/activity-logs",
    }
    assert required <= paths.keys()
    assert schema["info"]["title"] == "SIGAC — Sistema de Gestão de Acesso ao Armazenamento Científico API"


def test_health_is_public():
    with TestClient(app) as client:
        response = client.get("/health")
    assert response.status_code in (200, 503)
    assert response.json()["service"] == "fastapi"
    assert response.headers.get("x-correlation-id")


def test_protected_operations_keep_expected_methods():
    schema = app.openapi()
    assert "get" in schema["paths"]["/api/projects"]
    assert "post" in schema["paths"]["/api/projects"]
    assert "get" in schema["paths"]["/api/reports"]


def test_unknown_route_is_not_silently_accepted():
    with TestClient(app) as client:
        response = client.get("/api/route-that-does-not-exist")
    assert response.status_code == 404
