import base64
import logging
import os
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ProfilePhoto:
    content_type: str
    data_url: str


async def get_profile_photo(email: str) -> ProfilePhoto | None:
    tenant_id = os.getenv("ENTRA_TENANT_ID", "").strip()
    client_id = os.getenv("ENTRA_CLIENT_ID", "").strip()
    client_secret = os.getenv("ENTRA_CLIENT_SECRET", "").strip()
    if not email or not tenant_id or not client_id or not client_secret:
        logger.warning("entra_photo_unavailable configuration_missing=true")
        return None

    timeout = httpx.Timeout(10.0, connect=5.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        token_response = await client.post(
            f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token",
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "scope": "https://graph.microsoft.com/.default",
                "grant_type": "client_credentials",
            },
        )
        token_response.raise_for_status()
        access_token = token_response.json().get("access_token")
        if not access_token:
            logger.warning("entra_photo_token_missing=true")
            return None

        user_response = await client.get(
            "https://graph.microsoft.com/v1.0/users",
            params={"$filter": f"userPrincipalName eq '{email.replace(chr(39), chr(39) * 2)}'", "$select": "id"},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        user_response.raise_for_status()
        users = user_response.json().get("value", [])
        if not users:
            return None

        photo_response = await client.get(
            f"https://graph.microsoft.com/v1.0/users/{users[0]['id']}/photo/$value",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if photo_response.status_code == 404:
            return None
        photo_response.raise_for_status()
        content_type = photo_response.headers.get("content-type", "image/jpeg")
        encoded = base64.b64encode(photo_response.content).decode("ascii")
        return ProfilePhoto(content_type=content_type, data_url=f"data:{content_type};base64,{encoded}")
