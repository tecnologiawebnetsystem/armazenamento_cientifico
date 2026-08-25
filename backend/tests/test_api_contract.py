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
    assert schema["info"]["title"] == "Armazenamento Científico API"


def test_health_is_public():
    with TestClient(app) as client:
        response = client.get("/health")
    assert response.status_code in (200, 503)
    assert response.json()["service"] == "fastapi"
