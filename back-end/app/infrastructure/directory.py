"""Resolução de SIDs/grupos e membros no diretório corporativo.

Ordem de consulta: SIDs conhecidos do Windows -> AD via LDAP (conta de serviço)
-> Microsoft Graph (somente objetos sincronizados com o Entra ID).
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Protocol

import httpx

from app.core.config import Settings
from app.infrastructure.folder_acl import sid_to_bytes

logger = logging.getLogger(__name__)

GUID_PATTERN = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE)
WELL_KNOWN_SIDS: dict[str, tuple[str, bool]] = {
    "S-1-1-0": ("Todos", True),
    "S-1-5-11": ("Usuários autenticados", True),
    "S-1-5-32-545": ("BUILTIN\\Usuários", True),
    "S-1-5-32-544": ("BUILTIN\\Administradores", False),
    "S-1-5-18": ("SISTEMA", False),
    "S-1-3-0": ("Proprietário criador", False),
    "S-1-3-1": ("Grupo criador", False),
}
WELL_KNOWN_DOMAIN_RIDS: dict[str, tuple[str, bool]] = {
    "513": ("Usuários do domínio", True),
    "512": ("Admins. do domínio", False),
}


@dataclass(frozen=True)
class DirectoryMember:
    login: str
    name: str
    email: str = ""


@dataclass
class DirectoryPrincipal:
    sid: str | None
    name: str
    kind: str  # group | user | wellknown | unix | unknown
    source: str  # ldap | graph | windows | none
    display_name: str = ""
    entra_id: str | None = None
    dn: str | None = None
    broad: bool = False
    members: list[DirectoryMember] = field(default_factory=list)
    members_truncated: bool = False
    members_source: str | None = None

    def aliases(self) -> set[str]:
        return {value.casefold() for value in (self.sid, self.name, self.display_name, self.entra_id) if value}


class DirectoryBackend(Protocol):
    name: str

    def by_sid(self, sid: str) -> DirectoryPrincipal | None: ...

    def by_name(self, identifier: str) -> DirectoryPrincipal | None: ...

    def load_members(self, principal: DirectoryPrincipal, limit: int) -> bool: ...


class LdapDirectory:
    name = "ldap"

    def __init__(self, settings: Settings):
        from ldap3 import NTLM, SIMPLE, Server

        self._server = Server(
            settings.ad_ldap_server.strip(), port=389, use_ssl=settings.ad_ldap_use_ssl, connect_timeout=10
        )
        user = settings.ad_ldap_bind_user.strip()
        if not user and settings.ad_ldap_bind_dn.strip():
            user = settings.ad_ldap_bind_dn.strip()
        self._user = user
        self._password = settings.ad_ldap_bind_password
        self._auth = SIMPLE if settings.ad_ldap_bind_dn.strip() else (NTLM if "\\" in user else SIMPLE)
        self._receive_timeout = 30
        self.base_dn = settings.ad_ldap_base_dn.strip()
        self.connection = self._connect()

    def _connect(self):
        from ldap3 import Connection

        return Connection(
            self._server,
            user=self._user,
            password=self._password,
            authentication=self._auth,
            read_only=True,
            receive_timeout=self._receive_timeout,
            auto_bind=True,
        )

    def _reconnect(self) -> None:
        try:
            self.connection.unbind()
        except Exception as error:  # noqa: BLE001
            logger.debug("folder_access_ldap_unbind_failed error=%s", type(error).__name__)
        self.connection = self._connect()

    @staticmethod
    def _first(entry: dict, attribute: str) -> str:
        value = entry.get(attribute)
        if isinstance(value, list):
            value = value[0] if value else ""
        return str(value or "")

    def _search_one(self, search_filter: str) -> DirectoryPrincipal | None:
        self.connection.search(
            self.base_dn,
            search_filter,
            attributes=["sAMAccountName", "displayName", "objectClass", "distinguishedName", "objectSid"],
            size_limit=1,
        )
        if not self.connection.response:
            return None
        entry = next((item for item in self.connection.response if item.get("type") == "searchResEntry"), None)
        if not entry:
            return None
        attributes = entry["attributes"]
        classes = [str(item).casefold() for item in attributes.get("objectClass", [])]
        return DirectoryPrincipal(
            sid=str(attributes.get("objectSid") or "") or None,
            name=self._first(attributes, "sAMAccountName"),
            display_name=self._first(attributes, "displayName"),
            kind="group" if "group" in classes else "user",
            source=self.name,
            dn=entry.get("dn"),
        )

    def by_sid(self, sid: str) -> DirectoryPrincipal | None:
        from ldap3.utils.conv import escape_bytes

        return self._search_one(f"(objectSid={escape_bytes(sid_to_bytes(sid))})")

    def by_name(self, identifier: str) -> DirectoryPrincipal | None:
        from ldap3.utils.conv import escape_filter_chars

        value = escape_filter_chars(identifier)
        return self._search_one(f"(&(objectClass=group)(|(sAMAccountName={value})(cn={value})))")

    def load_members(self, principal: DirectoryPrincipal, limit: int) -> bool:
        from ldap3.utils.conv import escape_filter_chars

        if principal.kind != "group" or not principal.dn:
            return False
        # Primeiro tenta membros diretos (mais rapido). Se voltar vazio, tenta
        # a regra de nested membership (LDAP_MATCHING_RULE_IN_CHAIN).
        for attempt, use_nested in enumerate([False, True]):
            if use_nested:
                search_filter = (
                    "(&(objectCategory=person)(objectClass=user)"
                    f"(memberOf:1.2.840.113556.1.4.1941:={escape_filter_chars(principal.dn)}))"
                )
            else:
                search_filter = (
                    "(&(objectCategory=person)(objectClass=user)"
                    f"(memberOf={escape_filter_chars(principal.dn)}))"
                )
            members: list[DirectoryMember] = []
            try:
                for entry in self.connection.extend.standard.paged_search(
                    self.base_dn,
                    search_filter,
                    attributes=["sAMAccountName", "displayName", "mail"],
                    paged_size=100,
                    generator=True,
                ):
                    if entry.get("type") != "searchResEntry":
                        continue
                    if len(members) >= limit:
                        principal.members_truncated = True
                        break
                    attributes = entry["attributes"]
                    members.append(
                        DirectoryMember(
                            login=self._first(attributes, "sAMAccountName"),
                            name=self._first(attributes, "displayName"),
                            email=self._first(attributes, "mail"),
                        )
                    )
                if members:
                    principal.members = members
                    principal.members_source = self.name
                    return True
                # Membros diretos vazio, tenta nested (segunda iteracao) se nao for a ultima
                if not use_nested:
                    continue
                # Nested tambem vazio - retorna com lista vazia
                principal.members = members
                principal.members_source = self.name
                return True
            except Exception as error:  # noqa: BLE001
                logger.warning(
                    "folder_access_ldap_members_failed dn=%s nested=%s error=%s",
                    principal.dn, use_nested, type(error).__name__,
                )
                if attempt == 0 and not use_nested:
                    self._reconnect()
                else:
                    return False
        return False

    def close(self) -> None:
        self.connection.unbind()


class GraphDirectory:
    name = "graph"
    base_url = "https://graph.microsoft.com/v1.0"

    def __init__(self, settings: Settings):
        self.client = httpx.Client(timeout=20)
        response = self.client.post(
            f"https://login.microsoftonline.com/{settings.entra_tenant_id.strip()}/oauth2/v2.0/token",
            data={
                "client_id": settings.entra_client_id.strip(),
                "client_secret": settings.entra_client_secret.strip(),
                "scope": "https://graph.microsoft.com/.default",
                "grant_type": "client_credentials",
            },
        )
        response.raise_for_status()
        self.headers = {"Authorization": f"Bearer {response.json()['access_token']}", "ConsistencyLevel": "eventual"}

    def _principal(self, item: dict, kind: str) -> DirectoryPrincipal:
        return DirectoryPrincipal(
            sid=item.get("onPremisesSecurityIdentifier"),
            name=item.get("onPremisesSamAccountName") or item.get("displayName") or item["id"],
            display_name=item.get("displayName") or "",
            kind=kind,
            source=self.name,
            entra_id=item["id"],
        )

    def _find(self, kind: str, odata_filter: str) -> DirectoryPrincipal | None:
        response = self.client.get(
            f"{self.base_url}/{kind}s",
            params={"$filter": odata_filter, "$select": "id,displayName,onPremisesSamAccountName,onPremisesSecurityIdentifier", "$count": "true"},
            headers=self.headers,
        )
        if response.status_code != 200:
            return None
        items = response.json().get("value", [])
        return self._principal(items[0], kind) if items else None

    def by_sid(self, sid: str) -> DirectoryPrincipal | None:
        odata_filter = f"onPremisesSecurityIdentifier eq '{sid}'"
        return self._find("group", odata_filter) or self._find("user", odata_filter)

    def by_name(self, identifier: str) -> DirectoryPrincipal | None:
        if GUID_PATTERN.match(identifier):
            response = self.client.get(
                f"{self.base_url}/groups/{identifier}",
                params={"$select": "id,displayName,onPremisesSamAccountName,onPremisesSecurityIdentifier"},
                headers=self.headers,
            )
            return self._principal(response.json(), "group") if response.status_code == 200 else None
        value = identifier.replace("'", "''")
        return self._find("group", f"displayName eq '{value}' or onPremisesSamAccountName eq '{value}'")

    def load_members(self, principal: DirectoryPrincipal, limit: int) -> bool:
        if principal.kind != "group" or not principal.entra_id:
            return False
        url: str | None = f"{self.base_url}/groups/{principal.entra_id}/transitiveMembers/microsoft.graph.user"
        params: dict | None = {"$select": "displayName,onPremisesSamAccountName,mail,userPrincipalName", "$top": "999"}
        members: list[DirectoryMember] = []
        while url:
            response = self.client.get(url, params=params, headers=self.headers)
            response.raise_for_status()
            payload = response.json()
            for item in payload.get("value", []):
                if len(members) >= limit:
                    principal.members_truncated = True
                    url = None
                    break
                members.append(
                    DirectoryMember(
                        login=item.get("onPremisesSamAccountName") or item.get("userPrincipalName") or "",
                        name=item.get("displayName") or "",
                        email=item.get("mail") or "",
                    )
                )
            else:
                url, params = payload.get("@odata.nextLink"), None
        principal.members = members
        principal.members_source = self.name
        return True

    def close(self) -> None:
        self.client.close()


def well_known_principal(sid: str) -> DirectoryPrincipal | None:
    if sid in WELL_KNOWN_SIDS:
        name, broad = WELL_KNOWN_SIDS[sid]
        return DirectoryPrincipal(sid=sid, name=name, kind="wellknown", source="windows", broad=broad)
    if sid.startswith("S-1-5-21-"):
        rid = sid.rsplit("-", 1)[-1]
        if rid in WELL_KNOWN_DOMAIN_RIDS:
            name, broad = WELL_KNOWN_DOMAIN_RIDS[rid]
            return DirectoryPrincipal(sid=sid, name=name, kind="wellknown", source="windows", broad=broad)
    if sid.startswith(("S-1-22-", "S-1-6-")):
        # IDs sintetizados pelo storage para permissões UNIX (dono/grupo/outros).
        return DirectoryPrincipal(sid=sid, name=f"Identidade UNIX ({sid})", kind="unix", source="windows")
    return None


class DirectoryResolver:
    """Resolve principals com cache por requisição, tentando cada backend configurado em ordem."""

    def __init__(self, backends: list[DirectoryBackend], member_limit: int):
        self.backends = backends
        self.member_limit = member_limit
        self._cache: dict[str, DirectoryPrincipal | None] = {}

    @classmethod
    def from_settings(cls, settings: Settings) -> tuple[DirectoryResolver, list[str]]:
        backends: list[DirectoryBackend] = []
        warnings: list[str] = []
        if settings.ad_ldap_server.strip() and (settings.ad_ldap_bind_user.strip() or settings.ad_ldap_bind_dn.strip()):
            try:
                backends.append(LdapDirectory(settings))
            except Exception as error:  # noqa: BLE001 - falha de bind/rede não deve derrubar a consulta
                logger.warning("folder_access_ldap_unavailable error=%s", type(error).__name__)
                warnings.append("AD (LDAP) indisponível; verifique a conta de serviço e a rede.")
        elif not settings.ad_ldap_server.strip():
            # Sem LDAP, o aviso é informativo — a consulta funciona com os dados do Graph e da ACL
            pass
        else:
            warnings.append("AD (LDAP) configurado incompleto; verifique AD_LDAP_SERVER e AD_LDAP_BIND_USER.")
        if settings.entra_tenant_id.strip() and settings.entra_client_id.strip() and settings.entra_client_secret.strip():
            try:
                backends.append(GraphDirectory(settings))
            except Exception as error:  # noqa: BLE001
                logger.warning("folder_access_graph_unavailable error=%s", type(error).__name__)
                warnings.append("Microsoft Graph indisponível.")
        return cls(backends, settings.folder_access_max_members), warnings

    def _lookup(self, key: str, finder: str, value: str) -> DirectoryPrincipal | None:
        if key in self._cache:
            return self._cache[key]
        principal = None
        for backend in self.backends:
            try:
                principal = getattr(backend, finder)(value)
            except Exception as error:  # noqa: BLE001
                logger.warning("folder_access_lookup_failed backend=%s error=%s", backend.name, type(error).__name__)
                continue
            if principal:
                break
        self._cache[key] = principal
        return principal

    def resolve_sid(self, sid: str) -> DirectoryPrincipal:
        known = well_known_principal(sid)
        if known:
            return known
        principal = self._lookup(f"sid:{sid}", "by_sid", sid)
        if principal:
            principal.sid = principal.sid or sid
            return principal
        return DirectoryPrincipal(sid=sid, name=sid, kind="unknown", source="none")

    def resolve_name(self, identifier: str) -> DirectoryPrincipal | None:
        return self._lookup(f"name:{identifier.casefold()}", "by_name", identifier)

    def load_members(self, principal: DirectoryPrincipal) -> None:
        if principal.kind != "group" or principal.members_source:
            return
        # Tenta primeiro o backend que encontrou o grupo; os demais servem de complemento.
        ordered = sorted(self.backends, key=lambda backend: backend.name != principal.source)
        for backend in ordered:
            try:
                if backend.load_members(principal, self.member_limit):
                    return
            except Exception as error:  # noqa: BLE001
                logger.warning("folder_access_members_failed backend=%s error=%s", backend.name, type(error).__name__)

    def close(self) -> None:
        for backend in self.backends:
            try:
                backend.close()
            except Exception as error:  # noqa: BLE001
                logger.debug("folder_access_close_failed backend=%s error=%s", backend.name, type(error).__name__)
