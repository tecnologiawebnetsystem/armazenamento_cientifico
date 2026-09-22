import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_current_user
from app.app import app

PROTECTED_ENDPOINTS = [
    ("/api/folders?projectId=missing", "get"),
    ("/api/report-fields?report_code=project", "get"),
    ("/api/reports", "get"),
    ("/api/catalogos", "get"),
    ("/api/activity-logs", "get"),
    ("/api/platform/context", "get"),
]


def request(client: TestClient, method: str, path: str):
    return getattr(client, method)(path)


@pytest.mark.parametrize(("path", "method"), PROTECTED_ENDPOINTS)
def test_protected_endpoints_require_session(path: str, method: str):
    with TestClient(app) as client:
        response = request(client, method, path)
    assert response.status_code == 401


@pytest.mark.parametrize(("path", "method"), PROTECTED_ENDPOINTS)
def test_protected_endpoints_return_success_for_authenticated_user(path: str, method: str):
    async def authenticated_user():
        return {"id": "user-1", "role": "admin", "permissions": ["projeto.visualizar", "relatorio.exportar", "pesquisa.visualizar", "auditoria.visualizar"]}

    app.dependency_overrides[get_current_user] = authenticated_user
    try:
        try:
            with TestClient(app) as client:
                response = request(client, method, path)
        except ConnectionRefusedError:
            pytest.skip("PostgreSQL não está disponível neste ambiente de testes")
        assert response.status_code not in {401, 403}
    finally:
        app.dependency_overrides.clear()


def test_protected_endpoint_denies_missing_capability():
    async def limited_user():
        return {"id": "user-1", "role": "admin", "permissions": []}

    app.dependency_overrides[get_current_user] = limited_user
    try:
        try:
            with TestClient(app) as client:
                response = client.get("/api/activity-logs")
        except ConnectionRefusedError:
            pytest.skip("PostgreSQL não está disponível neste ambiente de testes")
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()
