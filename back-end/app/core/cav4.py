from dataclasses import dataclass
from typing import Any, Protocol


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


class CAV4Provider(Protocol):
    async def build_login_url(self, *, state: str, redirect_uri: str) -> str: ...

    async def exchange_callback(self, *, code: str, state: str) -> CAV4Identity: ...


class UnconfiguredCAV4Provider:
    """Ponto de extensão até o contrato oficial do CAV4 ser recebido."""

    async def build_login_url(self, *, state: str, redirect_uri: str) -> str:
        raise CAV4AuthenticationError("CAV4 ainda não está configurado")

    async def exchange_callback(self, *, code: str, state: str) -> CAV4Identity:
        raise CAV4AuthenticationError("CAV4 ainda não está configurado")


def get_cav4_provider() -> CAV4Provider:
    return UnconfiguredCAV4Provider()
