from __future__ import annotations

import asyncio
import os
import subprocess
from dataclasses import dataclass


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
        return AclResult("nao_configurado", [], "A pasta raiz não está configurada para este projeto.")
    if os.name != "nt":
        return AclResult("indisponivel", [], "A consulta de ACL está disponível no host Windows que possui acesso à rede.")

    try:
        return await asyncio.to_thread(_read_with_powershell, path)
    except subprocess.TimeoutExpired:
        return AclResult("tempo_esgotado", [], "A consulta à pasta de rede excedeu o tempo limite.")
    except OSError:
        return AclResult("acesso_negado", [], "Não foi possível ler as permissões desta pasta com a conta atual.")


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
    import json

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
