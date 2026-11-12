import json
import re
from datetime import UTC, datetime
from urllib.parse import quote

import httpx
from fastapi import HTTPException

from app.core.config import settings

RITM_PATTERN = re.compile(r"^RITM\d{5,}$", re.IGNORECASE)


def _resolve_status(status: str) -> str:
    if not settings.servicenow_status_map_json.strip():
        raise HTTPException(
            status_code=503,
            detail="Mapeamento de status SIGAC ainda não configurado.",
        )
    try:
        mapping = json.loads(settings.servicenow_status_map_json)
    except json.JSONDecodeError as error:
        raise HTTPException(status_code=503, detail="Mapeamento de status SIGAC inválido.") from error

    target = mapping.get(f"RITM:{status}") if isinstance(mapping, dict) else None
    if not isinstance(target, str) or not target.strip():
        raise HTTPException(
            status_code=422,
            detail="Não há status SIGAC aprovado para esta transição de RITM.",
        )
    return target.strip()


async def update_ritm_status(ritm_number: str, status: str) -> dict[str, str]:
    normalized_number = ritm_number.strip().upper()
    if not RITM_PATTERN.fullmatch(normalized_number):
        raise HTTPException(status_code=422, detail="Referência RITM inválida.")

    base_url = settings.servicenow_api_base_url.strip().rstrip("/")
    token = settings.servicenow_api_token.strip()
    if not base_url or not token:
        raise HTTPException(status_code=503, detail="Integração SIGAC não configurada.")
    if settings.environment.lower() == "production" and not base_url.lower().startswith("https://"):
        raise HTTPException(status_code=503, detail="A integração SIGAC exige HTTPS em produção.")

    target_status = _resolve_status(status)
    endpoint = (
        f"{base_url}/ti/itsm/v1/itsm-chamados/chamados/ref/"
        f"{quote(normalized_number, safe='')}/status"
    )
    try:
        async with httpx.AsyncClient(timeout=settings.servicenow_timeout_seconds) as client:
            response = await client.put(
                endpoint,
                json={"status": target_status},
                headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            )
    except httpx.TimeoutException as error:
        raise HTTPException(status_code=504, detail="Tempo limite excedido ao atualizar o RITM no SIGAC.") from error
    except httpx.RequestError as error:
        raise HTTPException(status_code=502, detail="Não foi possível conectar ao SIGAC.") from error

    if response.status_code not in {200, 201, 204}:
        status_code = response.status_code if response.status_code in {400, 401, 403, 404, 406} else 502
        raise HTTPException(
            status_code=status_code,
            detail=f"SIGAC recusou a atualização do RITM (HTTP {response.status_code}).",
        )

    return {
        "status": status,
        "updatedAt": datetime.now(UTC).isoformat(),
        "message": f"Status do RITM {normalized_number} atualizado no SIGAC.",
    }
