import pytest
from fastapi import HTTPException

from app.core.config import settings
from app.modules.servicenow.service import _resolve_status, update_ritm_status


def test_status_requires_an_approved_mapping(monkeypatch):
    monkeypatch.setattr(settings, "servicenow_status_map_json", "")

    with pytest.raises(HTTPException) as error:
        _resolve_status("Concluído")

    assert error.value.status_code == 503


def test_status_uses_configured_sigac_mapping(monkeypatch):
    monkeypatch.setattr(
        settings,
        "servicenow_status_map_json",
        '{"RITM:Concluído":"<status SIGAC aprovado>"}',
    )

    assert _resolve_status("Concluído") == "<status SIGAC aprovado>"


@pytest.mark.asyncio
async def test_update_ritm_status_sends_authenticated_request(monkeypatch):
    monkeypatch.setattr(settings, "servicenow_api_base_url", "https://sigac.example")
    monkeypatch.setattr(settings, "servicenow_api_token", "secret-token")
    monkeypatch.setattr(
        settings,
        "servicenow_status_map_json",
        '{"RITM:Concluído":"<status SIGAC aprovado>"}',
    )

    class Response:
        status_code = 204

    class Client:
        def __init__(self, **kwargs):
            assert kwargs["timeout"] == settings.servicenow_timeout_seconds

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def put(self, url, **kwargs):
            assert url == "https://sigac.example/ti/itsm/v1/itsm-chamados/chamados/ref/RITM0012345/status"
            assert kwargs["json"] == {"status": "<status SIGAC aprovado>"}
            assert kwargs["headers"]["Authorization"] == "Bearer secret-token"
            return Response()

    monkeypatch.setattr("app.modules.servicenow.service.httpx.AsyncClient", Client)

    result = await update_ritm_status("ritm0012345", "Concluído")

    assert result["status"] == "Concluído"
    assert result["message"] == "Status do RITM RITM0012345 atualizado no SIGAC."
    assert result["updatedAt"]


@pytest.mark.asyncio
async def test_update_ritm_status_requires_https_in_production(monkeypatch):
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "servicenow_api_base_url", "http://sigac.example")
    monkeypatch.setattr(settings, "servicenow_api_token", "secret-token")
    monkeypatch.setattr(
        settings,
        "servicenow_status_map_json",
        '{"RITM:Concluído":"status-aprovado"}',
    )

    with pytest.raises(HTTPException) as error:
        await update_ritm_status("RITM0012345", "Concluído")

    assert error.value.status_code == 503


@pytest.mark.asyncio
async def test_update_ritm_status_rejects_invalid_reference_before_network(monkeypatch):
    monkeypatch.setattr(settings, "servicenow_api_base_url", "https://sigac.example")
    monkeypatch.setattr(settings, "servicenow_api_token", "secret-token")

    with pytest.raises(HTTPException) as error:
        await update_ritm_status("not-a-ritm", "Concluído")

    assert error.value.status_code == 422
