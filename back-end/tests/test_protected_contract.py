from fastapi.testclient import TestClient

from app.main import app


def test_protected_endpoint_without_session_returns_401():
    with TestClient(app) as client:
        response = client.get("/api/projects")
    assert response.status_code == 401


def test_protected_mutation_without_session_returns_401():
    with TestClient(app) as client:
        response = client.post("/api/projects", json={"nome": "Teste"})
    assert response.status_code == 401


def test_database_permissions_do_not_use_role_fallback():
    from app.core.authorization import has_capability

    user = {"role": "admin", "permissions": ["projeto.visualizar"]}
    assert has_capability(user, "read") is True
    assert has_capability(user, "delete") is False
