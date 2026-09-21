import base64
import binascii
import hashlib
import json
import logging
import secrets
import ssl
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from time import perf_counter
from typing import Any, Protocol
from urllib.parse import quote, urlencode

import httpx
import jwt
import truststore
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
    wanted = {name.casefold() for name in names}

    def collect(value: Any, key: str | None = None) -> None:
        if key is not None and key.casefold() not in wanted:
            if isinstance(value, dict):
                for nested_key, nested_value in value.items():
                    collect(nested_value, str(nested_key))
            elif isinstance(value, (list, tuple, set)):
                for item in value:
                    collect(item)
            return
        if isinstance(value, str):
            values.extend(part.strip() for part in value.replace(",", " ").split() if part.strip())
        elif isinstance(value, (list, tuple, set)):
            for item in value:
                collect(item)
        elif isinstance(value, dict):
            for nested_key, nested_value in value.items():
                collect(nested_value, str(nested_key))

    for key, value in claims.items():
        collect(value, str(key))
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
    except (ValueError, KeyError, TypeError, UnicodeDecodeError, binascii.Error, json.JSONDecodeError) as exc:
        raise CAV4AuthenticationError("State CAV4 inválido") from exc


def _build_httpx_client() -> httpx.AsyncClient:
    """Cria cliente HTTP usando CA corporativa ou trust store do sistema."""
    if not settings.ca_ssl_verify:
        verify: bool | str = False
        tls_source = "disabled"
    elif settings.ca_ssl_cert_file:
        ca_file = Path(settings.ca_ssl_cert_file)
        if not ca_file.is_file():
            raise CAV4AuthenticationError(f"CA_SSL_CERT_FILE não encontrado: {ca_file}")
        verify = str(ca_file)
        tls_source = "ca_file"
    elif settings.ca_ssl_use_truststore:
        verify = truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        tls_source = "system_truststore"
    else:
        verify = True
        tls_source = "certifi"

    logger.info(
        "[CAV4] TLS configurado verify=%s source=%s truststore=%s ca_file_configured=%s",
        settings.ca_ssl_verify,
        tls_source,
        settings.ca_ssl_use_truststore,
        bool(settings.ca_ssl_cert_file),
    )
    return httpx.AsyncClient(verify=verify)


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
        started_at = perf_counter()
        try:
            async with _build_httpx_client() as client:
                resp = await client.get(settings.oidc_discovery_url, timeout=10.0)
                resp.raise_for_status()
                self._discovery_cache = resp.json()
                logger.info(
                    "[CAV4] discovery_ok status=%s duration_ms=%.2f host=%s",
                    resp.status_code,
                    (perf_counter() - started_at) * 1000,
                    settings.oidc_discovery_url.split('/')[2],
                )
                return self._discovery_cache
        except httpx.HTTPError as e:
            logger.error(
                "[CAV4] Erro ao buscar discovery verify=%s erro=%s",
                settings.ca_ssl_verify,
                str(e),
            )
            raise CAV4AuthenticationError(
                "Erro ao conectar com CAV4. Verifique CA_SSL_VERIFY e reinicie o backend."
            ) from e

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

        started_at = perf_counter()
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
                logger.info(
                    "[CAV4] token_exchange_ok status=%s duration_ms=%.2f id_token_present=%s",
                    token_resp.status_code,
                    (perf_counter() - started_at) * 1000,
                    bool(token_data.get("id_token")),
                )
        except httpx.HTTPStatusError as e:
            logger.error("[CAV4] Troca de código rejeitada status=%s response=%s", e.response.status_code, e.response.text[:500])
            raise CAV4AuthenticationError(f"CAV4 rejeitou a troca do código (HTTP {e.response.status_code}); inicie o login novamente") from e
        except httpx.HTTPError as e:
            logger.error(
                "[CAV4] Erro ao trocar código verify=%s erro=%s",
                settings.ca_ssl_verify,
                str(e),
            )
            raise CAV4AuthenticationError(
                "Erro ao obter token do CAV4. Verifique CA_SSL_VERIFY e reinicie o backend."
            ) from e

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

        access_token = token_data.get("access_token")
        email = claims.get("email") or claims.get("preferred_username") or claims.get("upn") or ""
        display_name = claims.get("name")
        if access_token and settings.cav4_userinfo_url:
            userinfo = await self.get_user_data(access_token=access_token, endpoint=settings.cav4_userinfo_url)
            if isinstance(userinfo, dict):
                email = email or userinfo.get("email") or userinfo.get("preferred_username") or userinfo.get("upn") or ""
                display_name = display_name or userinfo.get("name")
                claims = {**claims, **userinfo}

        if access_token and settings.cav4_resources_url and settings.cav4_base_url:
            user_login = email or claims.get("preferred_username") or claims.get("upn") or claims.get("sub") or ""
            if not user_login:
                raise CAV4AuthenticationError("Login do usuário não encontrado para consultar os papéis do CAV4")
            roles_endpoint = settings.cav4_resources_url.replace("{userLogin}", quote(str(user_login), safe=""))
            resources = await self.get_user_data(access_token=access_token, endpoint=roles_endpoint)
            if isinstance(resources, (dict, list)):
                resource_roles = _claim_values(
                    resources if isinstance(resources, dict) else {"content": resources},
                    "roles",
                    "role",
                    "profile",
                    "profile_id",
                    "profileId",
                    "content",
                    "items",
                    "data",
                    "code",
                    "id",
                    "name",
                )
                claims = {**claims, "cav4_resource_roles": resource_roles}
                logger.info("[CAV4] Papéis do usuário consultados endpoint=%s quantidade=%s", roles_endpoint, len(resource_roles))

        roles = _claim_values(
            claims,
            "roles",
            "role",
            "groups",
            "group",
            "profile",
            "profile_id",
            "profileId",
            "information-values",
            "information_values",
            "resources",
            "resource",
            "resource_code",
            "resourceCode",
            "code",
            "cav4_resource_roles",
        )
        logger.info("[CAV4] Claims de autorização encontrados chaves=%s quantidade_papeis=%s", sorted(claims.keys()), len(roles))

        return CAV4Identity(
            subject=claims.get("sub", ""),
            email=email,
            display_name=display_name,
            roles=roles,
            permissions=_claim_values(claims, "permissions", "scp", "scope"),
            raw_claims=claims,
            access_token=access_token,
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


@lru_cache(maxsize=1)
def get_cav4_provider() -> CAV4Provider:
    """Retorna provider CAV4 OIDC se habilitado, senão placeholder."""
    if settings.cav4_enabled:
        return CAV4OIDCProvider()
    return UnconfiguredCAV4Provider()
