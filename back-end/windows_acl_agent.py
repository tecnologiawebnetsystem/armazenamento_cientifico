from __future__ import annotations

import json
import os
import subprocess
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

app = FastAPI(title="SIGAC Windows ACL Agent")
TOKEN = os.getenv("ACL_AGENT_TOKEN", "")


class AclRequest(BaseModel):
    path: str


@app.post("/acl")
def read_acl(request: AclRequest, x_acl_agent_token: str | None = Header(default=None)) -> dict[str, Any]:
    if TOKEN and x_acl_agent_token != TOKEN:
        raise HTTPException(status_code=401, detail="Token inválido")
    if not request.path.startswith("\\\\"):
        raise HTTPException(status_code=400, detail="Apenas caminhos UNC são permitidos")

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
    try:
        result = subprocess.run(
            ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", script, request.path],
            capture_output=True, text=True, timeout=20, check=True,
        )
        raw = json.loads(result.stdout or "[]")
        return {"entries": raw if isinstance(raw, list) else [raw]}
    except subprocess.TimeoutExpired as error:
        raise HTTPException(status_code=504, detail="Consulta excedeu o tempo limite") from error
    except subprocess.CalledProcessError as error:
        raise HTTPException(status_code=403, detail=(error.stderr or "Acesso negado").strip()) from error
    except (OSError, json.JSONDecodeError) as error:
        raise HTTPException(status_code=503, detail="Não foi possível consultar a ACL") from error


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("ACL_AGENT_PORT", "8765")))
