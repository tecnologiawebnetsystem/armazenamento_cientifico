from __future__ import annotations

import asyncio
import json
import os
import subprocess
from dataclasses import dataclass

import httpx

from app.core.config import settings


@dataclass(frozen=True)
class AclEntry:
    principal: str
    principal_type: str
    access_type: str
    permissions: list[str]
    inherited: bool


@dataclass(frozen=True)
class AclResult:
    status: str
    entries: list[AclEntry]
    message: str | None = None
    scope: str = "pasta_mae"


async def read_folder_acl(path: str) -> AclResult:
    if not path:
        return AclResult("nao_configurado", [], "A pasta mãe não está configurada para este projeto.")
    if settings.acl_agent_url:
        return await _read_from_windows_agent(path)
    if os.name != "nt":
        return AclResult("indisponivel", [], "Configure ACL_AGENT_URL apontando para o agente Windows da rede.")

    try:
        return await asyncio.to_thread(_read_with_powershell, path)
    except subprocess.TimeoutExpired:
        return AclResult("tempo_esgotado", [], "A consulta à pasta de rede excedeu o tempo limite.")
    except subprocess.CalledProcessError as error:
        detail = (error.stderr or "").strip()
        if "Access is denied" in detail or "Acesso negado" in detail:
            message = "A conta atual não tem permissão para ler a segurança desta pasta mãe."
            status = "acesso_negado"
        elif "Cannot find path" in detail or "não pode encontrar" in detail.lower():
            message = "A pasta mãe não foi encontrada ou não está acessível na rede."
            status = "indisponivel"
        else:
            message = "Não foi possível consultar as permissões da pasta mãe no host Windows."
            status = "indisponivel"
        return AclResult(status, [], message)
    except (OSError, json.JSONDecodeError):
        return AclResult("indisponivel", [], "Não foi possível interpretar a resposta de segurança da pasta mãe.")


async def _read_from_windows_agent(path: str) -> AclResult:
    headers = {"X-ACL-Agent-Token": settings.acl_agent_token} if settings.acl_agent_token else {}
    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            response = await client.post(f"{settings.acl_agent_url.rstrip('/')}/acl", json={"path": path}, headers=headers)
        response.raise_for_status()
        payload = response.json()
        entries = [
            AclEntry(
                principal=item.get("principal", ""),
                principal_type=item.get("principalType", "principal"),
                access_type=item.get("accessType", "allow"),
                permissions=item.get("permissions", []),
                inherited=bool(item.get("inherited", False)),
            )
            for item in payload.get("entries", [])
        ]
        return AclResult("consultado", entries)
    except httpx.TimeoutException:
        return AclResult("tempo_esgotado", [], "O agente Windows não respondeu dentro do tempo limite.")
    except (httpx.HTTPError, ValueError):
        return AclResult("indisponivel", [], "Não foi possível conectar ao agente Windows de ACL.")


def _read_with_powershell(path: str) -> AclResult:
    script = r"""
$ErrorActionPreference = 'Stop'
$acl = Get-Acl -LiteralPath $args[0]
$acl.Access | ForEach-Object {
  [pscustomobject]@{
    principal = $_.IdentityReference.Value
    principalType = if ($_.IdentityReference.Value -match '\\') { 'grupo_ou_usuario' } else { 'principal' }
    accessType = $_.AccessControlType.ToString().ToLowerInvariant()
    permissions = @($_.FileSystemRights.ToString().Split(',') | ForEach-Object { $_.Trim() })
    inherited = [bool]$_.IsInherited
  }
} | ConvertTo-Json -Compress
"""
    completed = subprocess.run(
        ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", script, path],
        capture_output=True,
        text=True,
        timeout=20,
        check=True,
    )
    raw = json.loads(completed.stdout or "[]")
    if isinstance(raw, dict):
        raw = [raw]
    entries = [
        AclEntry(
            principal=item.get("principal", ""),
            principal_type=item.get("principalType", "principal"),
            access_type=item.get("accessType", "allow"),
            permissions=item.get("permissions", []),
            inherited=bool(item.get("inherited", False)),
        )
        for item in raw
    ]
    return AclResult("consultado", entries)


__all__ = ["AclEntry", "AclResult", "read_folder_acl"]
