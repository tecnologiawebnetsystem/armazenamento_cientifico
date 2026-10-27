import base64
import logging
from dataclasses import dataclass

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ProfilePhoto:
    content_type: str
    data_url: str


@dataclass(frozen=True)
class ProfilePhotoResult:
    photo: ProfilePhoto | None
    status: str
    reason: str | None = None


async def get_profile_photo(email: str) -> ProfilePhotoResult:
    settings = get_settings()
    tenant_id = settings.entra_tenant_id.strip()
    client_id = settings.entra_client_id.strip()
    client_secret = settings.entra_client_secret.strip()
    if not email:
        logger.warning("entra_photo_skipped reason=email_missing")
        return ProfilePhotoResult(None, "skipped", "email_missing")
    if not tenant_id or not client_id or not client_secret:
        logger.warning("entra_photo_unavailable reason=configuration_missing tenant=%s client=%s secret=%s", bool(tenant_id), bool(client_id), bool(client_secret))
        return ProfilePhotoResult(None, "unavailable", "configuration_missing")

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
        logger.info("entra_photo_token_response status=%s", token_response.status_code)
        token_response.raise_for_status()
        access_token = token_response.json().get("access_token")
        if not access_token:
            logger.warning("entra_photo_unavailable reason=token_missing")
            return ProfilePhotoResult(None, "unavailable", "token_missing")

        user_response = await client.get(
            "https://graph.microsoft.com/v1.0/users",
            params={"$filter": f"userPrincipalName eq '{email.replace(chr(39), chr(39) * 2)}'", "$select": "id"},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        logger.info("entra_photo_user_lookup status=%s", user_response.status_code)
        user_response.raise_for_status()
        users = user_response.json().get("value", [])
        if not users:
            logger.warning("entra_photo_unavailable reason=user_not_found")
            return ProfilePhotoResult(None, "unavailable", "user_not_found")

        photo_response = await client.get(
            f"https://graph.microsoft.com/v1.0/users/{users[0]['id']}/photo/$value",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        logger.info("entra_photo_graph_response status=%s", photo_response.status_code)
        if photo_response.status_code == 404:
            logger.warning("entra_photo_unavailable reason=photo_not_found")
            return ProfilePhotoResult(None, "unavailable", "photo_not_found")
        photo_response.raise_for_status()
        content_type = photo_response.headers.get("content-type", "image/jpeg")
        encoded = base64.b64encode(photo_response.content).decode("ascii")
        logger.info("entra_photo_success content_type=%s bytes=%s", content_type, len(photo_response.content))
        return ProfilePhotoResult(ProfilePhoto(content_type=content_type, data_url=f"data:{content_type};base64,{encoded}"), "success")
