import base64
import hashlib
import json
import logging
import secrets
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol
from urllib.parse import urlencode

import httpx
import jwt
from jwt import InvalidTokenError

from app.core.config import settings

logger = logging.getLogger(__name__)


class CAV4AuthenticationError(RuntimeError):
    """Erro seguro para falhas no provedor corporativo CAV4."""


@dataclass(frozen=True)
class CAV4Identity:
    subject: str
    email: str
    display_name: str | None = None
    roles: tuple[str, ...] = ()
    permissions: tuple[str, ...] = ()
    raw_claims: dict[str, Any] | None = None
    access_token: str | None = None


class CAV4Provider(Protocol):
    async def build_login_url(self, *, state: str, redirect_uri: str) -> str: ...

    async def exchange_callback(self, *, code: str, state: str) -> CAV4Identity: ...

    async def get_user_data(self, *, access_token: str, endpoint: str) -> Any: ...


class UnconfiguredCAV4Provider:
    """Ponto de extensão até o contrato oficial do CAV4 ser recebido."""

    async def build_login_url(self, *, state: str, redirect_uri: str) -> str:
        raise CAV4AuthenticationError("CAV4 ainda não está configurado")

    async def exchange_callback(self, *, code: str, state: str) -> CAV4Identity:
        raise CAV4AuthenticationError("CAV4 ainda não está configurado")


def _claim_values(claims: dict[str, Any], *names: str) -> tuple[str, ...]:
    values: list[str] = []
    for name in names:
        value = claims.get(name)
        if isinstance(value, str):
            values.extend(part.strip() for part in value.replace(",", " ").split() if part.strip())
        elif isinstance(value, list):
            values.extend(str(item).strip() for item in value if str(item).strip())
    return tuple(dict.fromkeys(values))


def _generate_pkce_pair() -> tuple[str, str]:
    """Gera code_verifier e code_challenge para PKCE."""
    code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode("utf-8").rstrip("=")
    code_challenge = base64.urlsafe_b64encode(hashlib.sha256(code_verifier.encode()).digest()).decode("utf-8").rstrip("=")
    return code_verifier, code_challenge


def decode_state_nonce(state: str) -> str:
    """Extrai o nonce original do state assinado pelo fluxo de login."""
    try:
        padded_state = state + "=" * (-len(state) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded_state).decode("utf-8"))
        nonce = payload["state"]
        if not isinstance(nonce, str) or not nonce:
            raise ValueError("nonce ausente")
        return nonce
    except (ValueError, KeyError, TypeError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise CAV4AuthenticationError("State CAV4 inválido") from exc


def _build_httpx_client() -> httpx.AsyncClient:
    """Cria cliente HTTP com certificados SSL configurados."""
    ca_certs = None
    if settings.ca_ssl_use_truststore and settings.ca_ssl_cert_file and Path(settings.ca_ssl_cert_file).is_file():
        ca_certs = settings.ca_ssl_cert_file
    elif settings.ca_ssl_use_truststore:
        ca_certs = True
    return httpx.AsyncClient(verify=ca_certs if settings.ca_ssl_verify else False)


class CAV4OIDCProvider:
    """Implementação OIDC com suporte a PKCE, JWT e validação de certificados."""

    def __init__(self):
        self._discovery_cache: dict[str, Any] | None = None
        self._jwks_cache: dict[str, Any] | None = None

    async def _fetch_discovery(self) -> dict[str, Any]:
        """Busca endpoints OIDC via discovery URL."""
        if self._discovery_cache:
            return self._discovery_cache
        if not settings.oidc_discovery_url:
            raise CAV4AuthenticationError("OIDC_DISCOVERY_URL não está configurada")
        try:
            async with _build_httpx_client() as client:
                resp = await client.get(settings.oidc_discovery_url, timeout=10.0)
                resp.raise_for_status()
                self._discovery_cache = resp.json()
                logger.info("[CAV4] Discovery endpoint carregado com sucesso")
                return self._discovery_cache
        except httpx.HTTPError as e:
            logger.error(f"[CAV4] Erro ao buscar discovery: {e}")
            raise CAV4AuthenticationError(f"Erro ao conectar com CAV4: {e}") from e

    async def _fetch_jwks(self) -> dict[str, Any]:
        """Busca JWKS público para validar assinaturas JWT."""
        if self._jwks_cache:
            return self._jwks_cache
        discovery = await self._fetch_discovery()
        jwks_uri = discovery.get("jwks_uri") or settings.cav4_jwks_url
        if not jwks_uri:
            raise CAV4AuthenticationError("JWKS URI não encontrada em discovery ou configuração")
        try:
            async with _build_httpx_client() as client:
                resp = await client.get(jwks_uri, timeout=10.0)
                resp.raise_for_status()
                self._jwks_cache = resp.json()
                logger.info("[CAV4] JWKS público carregado com sucesso")
                return self._jwks_cache
        except httpx.HTTPError as e:
            logger.error(f"[CAV4] Erro ao buscar JWKS: {e}")
            raise CAV4AuthenticationError(f"Erro ao validar certificado CAV4: {e}") from e

    async def build_login_url(self, *, state: str, redirect_uri: str) -> str:
        """Constrói URL de autorização com PKCE."""
        discovery = await self._fetch_discovery()
        auth_endpoint = discovery.get("authorization_endpoint") or settings.cav4_authorization_url
        if not auth_endpoint:
            raise CAV4AuthenticationError("Authorization endpoint não encontrado")

        code_verifier, code_challenge = _generate_pkce_pair()
        state_payload = base64.urlsafe_b64encode(json.dumps({"state": state, "verifier": code_verifier}).encode()).decode().rstrip("=")
        query = urlencode({
            "client_id": settings.cav4_client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": settings.cav4_scopes,
            "state": state_payload,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
        })
        logger.debug("[CAV4] URL de login construída com PKCE")
        return f"{auth_endpoint}?{query}"

    async def exchange_callback(self, *, code: str, state: str) -> CAV4Identity:
        """Troca código por identity, valida JWT e retorna claims."""
        discovery = await self._fetch_discovery()
        token_endpoint = discovery.get("token_endpoint") or settings.cav4_token_url
        if not token_endpoint:
            raise CAV4AuthenticationError("Token endpoint não encontrado")

        try:
            padded_state = state + "=" * (-len(state) % 4)
            state_payload = json.loads(base64.urlsafe_b64decode(padded_state).decode())
            code_verifier = state_payload["verifier"]
        except (ValueError, KeyError, json.JSONDecodeError) as e:
            raise CAV4AuthenticationError("State CAV4 inválido") from e

        try:
            async with _build_httpx_client() as client:
                token_resp = await client.post(
                    token_endpoint,
                    data={
                        "grant_type": "authorization_code",
                        "client_id": settings.cav4_client_id,
                        "client_secret": settings.cav4_client_secret,
                        "code": code,
                        "redirect_uri": settings.cav4_redirect_uri,
                        "code_verifier": code_verifier,
                    },
                    timeout=10.0,
                )
                token_resp.raise_for_status()
                token_data = token_resp.json()
        except httpx.HTTPStatusError as e:
            logger.error("[CAV4] Troca de código rejeitada status=%s response=%s", e.response.status_code, e.response.text[:500])
            raise CAV4AuthenticationError(f"CAV4 rejeitou a troca do código (HTTP {e.response.status_code}); inicie o login novamente") from e
        except httpx.HTTPError as e:
            logger.error(f"[CAV4] Erro ao trocar código: {e}")
            raise CAV4AuthenticationError(f"Erro ao obter token: {e}") from e

        id_token = token_data.get("id_token")
        if not id_token:
            raise CAV4AuthenticationError("id_token não retornado pelo servidor")

        try:
            jwks = await self._fetch_jwks()
            unverified_header = jwt.get_unverified_header(id_token)
            kid = unverified_header.get("kid")

            signing_key = None
            if kid and "keys" in jwks:
                for key in jwks["keys"]:
                    if key.get("kid") == kid:
                        signing_key = key
                        break

            if not signing_key and "keys" in jwks:
                signing_key = jwks["keys"][0]

            if isinstance(signing_key, dict):
                signing_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(signing_key))
            claims = jwt.decode(
                id_token,
                signing_key,
                algorithms=["RS256"],
                audience=settings.cav4_client_id,
                issuer=settings.cav4_issuer or discovery.get("issuer"),
                leeway=settings.cav4_jwt_leeway_seconds,
                options={"verify_aud": bool(settings.cav4_client_id)},
            )
            logger.info(f"[CAV4] JWT validado para usuário {claims.get('sub')}")
        except (InvalidTokenError, KeyError) as e:
            logger.error(f"[CAV4] Erro ao validar JWT: {e}")
            raise CAV4AuthenticationError(f"Erro ao validar token: {e}") from e

        return CAV4Identity(
            subject=claims.get("sub", ""),
            email=claims.get("email", ""),
            display_name=claims.get("name"),
            roles=_claim_values(claims, "roles", "groups", "role", "group", "information-values"),
            permissions=_claim_values(claims, "permissions", "scp", "scope"),
            raw_claims=claims,
            access_token=token_data.get("access_token"),
        )

    async def get_user_data(self, *, access_token: str, endpoint: str) -> Any:
        """Consulta dados do usuário no CAV4 sem expor o bearer token nos logs."""
        if not settings.cav4_base_url:
            raise CAV4AuthenticationError("CA_API_BASE_URL não está configurada")
        url = f"{settings.cav4_base_url.rstrip('/')}/{endpoint.lstrip('/')}"
        try:
            async with _build_httpx_client() as client:
                response = await client.get(url, headers={"Authorization": f"Bearer {access_token}"}, timeout=10.0)
                response.raise_for_status()
                payload = response.json()
                logger.info("[CAV4] Consulta concluída endpoint=%s status=%s", endpoint, response.status_code)
                return payload
        except (httpx.HTTPError, ValueError) as exc:
            logger.error("[CAV4] Falha na consulta endpoint=%s erro=%s", endpoint, exc)
            raise CAV4AuthenticationError(f"Erro ao consultar CAV4: {exc}") from exc


def get_cav4_provider() -> CAV4Provider:
    """Retorna provider CAV4 OIDC se habilitado, senão placeholder."""
    if settings.cav4_enabled:
        return CAV4OIDCProvider()
    return UnconfiguredCAV4Provider()
