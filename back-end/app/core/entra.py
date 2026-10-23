from __future__ import annotations

import base64
import logging
import time
from typing import Any
from urllib.parse import quote

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_GRAPH = "https://graph.microsoft.com/v1.0"
_TOKEN = "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
_token_cache: tuple[str, float] | None = None


def configured() -> bool:
    return bool(settings.entra_enabled and settings.entra_tenant_id and settings.entra_client_id and settings.entra_client_secret)


async def _app_token() -> str:
    global _token_cache
    now = time.monotonic()
    if _token_cache and _token_cache[1] > now + 60:
        return _token_cache[0]
    async with httpx.AsyncClient(timeout=settings.entra_timeout_seconds) as client:
        response = await client.post(
            _TOKEN.format(tenant=quote(settings.entra_tenant_id, safe="")),
            data={
                "client_id": settings.entra_client_id,
                "client_secret": settings.entra_client_secret,
                "grant_type": "client_credentials",
                "scope": "https://graph.microsoft.com/.default",
            },
        )
        response.raise_for_status()
        payload = response.json()
    token = str(payload["access_token"])
    _token_cache = (token, now + max(60, int(payload.get("expires_in", 3600))))
    return token


async def _request(path: str, *, params: dict[str, str] | None = None, binary: bool = False) -> Any:
    token = await _app_token()
    async with httpx.AsyncClient(timeout=settings.entra_timeout_seconds) as client:
        response = await client.get(f"{_GRAPH}{path}", params=params, headers={"Authorization": f"Bearer {token}"})
        if response.status_code == 404 and binary:
            return None
        response.raise_for_status()
        return response.content if binary else response.json()


async def enrich_by_email(email: str) -> dict[str, Any] | None:
    """Busca o usuário no Graph usando o e-mail corporativo do CAV4."""
    normalized = email.strip().casefold()
    if not normalized or not configured():
        return None
    select = "id,displayName,givenName,surname,mail,userPrincipalName,jobTitle,department,officeLocation,mobilePhone,businessPhones,accountEnabled"
    direct = await _request(f"/users/{quote(normalized, safe='')}", params={"$select": select})
    if not direct:
        result = await _request("/users", params={"$filter": f"mail eq '{normalized}' or userPrincipalName eq '{normalized}'", "$select": select})
        values = result.get("value", [])
        if len(values) != 1:
            return None
        direct = values[0]
    if settings.entra_required_group_id:
        membership = await _request(f"/users/{quote(direct['id'], safe='')}/memberOf", params={"$select": "id", "$top": "999"})
        group_ids = {str(item.get("id")) for item in membership.get("value", [])}
        if settings.entra_required_group_id not in group_ids:
            raise PermissionError("Usuário não pertence ao grupo corporativo obrigatório")
    return direct


async def profile_photo(entra_id: str) -> bytes | None:
    if not configured() or not entra_id:
        return None
    return await _request(f"/users/{quote(entra_id, safe='')}/photo/$value", binary=True)


def photo_data_url(content: bytes | None) -> str | None:
    if not content:
        return None
    return f"data:image/jpeg;base64,{base64.b64encode(content).decode('ascii')}"
