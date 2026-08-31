from __future__ import annotations

import logging
from urllib.parse import urlencode

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def configured() -> bool:
    return bool(settings.entra_tenant_id and settings.entra_client_id and settings.entra_client_secret)


def authorization_url(state: str) -> str:
    params = {
        "client_id": settings.entra_client_id,
        "response_type": "code",
        "redirect_uri": settings.entra_redirect_uri,
        "response_mode": "query",
        "scope": settings.entra_scopes,
        "state": state,
    }
    return f"https://login.microsoftonline.com/{settings.entra_tenant_id}/oauth2/v2.0/authorize?{urlencode(params)}"


async def exchange_code(code: str) -> dict:
    token_url = f"https://login.microsoftonline.com/{settings.entra_tenant_id}/oauth2/v2.0/token"
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(token_url, data={
            "client_id": settings.entra_client_id,
            "client_secret": settings.entra_client_secret,
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.entra_redirect_uri,
            "scope": settings.entra_scopes,
        })
        response.raise_for_status()
        return response.json()


async def graph_get(access_token: str, path: str, params: dict | None = None) -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(f"https://graph.microsoft.com/v1.0{path}", params=params, headers={"Authorization": f"Bearer {access_token}"})
        response.raise_for_status()
        return response.json()


async def profile(access_token: str) -> dict:
    return await graph_get(access_token, "/me", {"$select": "id,displayName,mail,userPrincipalName,jobTitle,department,signInActivity"})


async def groups(access_token: str) -> list[dict]:
    result = await graph_get(access_token, "/me/memberOf", {"$select": "id,displayName,description"})
    return [item for item in result.get("value", []) if item.get("@odata.type") in (None, "#microsoft.graph.group")]


async def photo(access_token: str) -> bytes | None:
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get("https://graph.microsoft.com/v1.0/me/photo/$value", headers={"Authorization": f"Bearer {access_token}"})
        if response.status_code == 404:
            return None
        response.raise_for_status()
        return response.content
