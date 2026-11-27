"""Consolida os acessos da pasta raiz do projeto: cadastro do SIGAC x ACL real x membros no AD."""

from __future__ import annotations

import hashlib
import json
import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

from app.infrastructure.directory import DirectoryPrincipal, DirectoryResolver
from app.infrastructure.folder_acl import (
    FolderAcl,
    FolderAclUnavailable,
    access_level,
    read_folder_acl,
    resolve_network_path,
    rights_label,
)
from app.modules.projects.schemas import (
    FolderAccessEntryOut,
    FolderAccessMemberOut,
    FolderAccessOut,
)

logger = logging.getLogger(__name__)

LEVEL_LABELS = {"leitura": "Leitura", "escrita": "Escrita", "administrador": "Administração"}
STATUS_ORDER = {
    "nivel_divergente": 0,
    "somente_rede": 1,
    "somente_sigac": 2,
    "nao_verificado": 3,
    "conforme": 4,
    "papel_aplicacao": 5,
}


def folder_access_entry_key(entry: dict) -> str:
    identity = {
        "tipo": entry.get("tipo"),
        "identificador": (entry.get("identificador") or "").casefold(),
        "sid": (entry.get("sid") or "").casefold(),
        "grupo": (entry.get("grupo") or "").casefold(),
    }
    canonical = json.dumps(identity, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class StoredGroup:
    name: str
    identifier: str
    principal_type: str
    access_level: str


@dataclass
class NetworkGrant:
    principal: DirectoryPrincipal
    allow_mask: int = 0
    deny_mask: int = 0
    inherited: bool = True
    matched: bool = False


def _grants(acl: FolderAcl, resolver: DirectoryResolver) -> dict[str, NetworkGrant]:
    grants: dict[str, NetworkGrant] = {}
    for entry in acl.entries:
        grant = grants.get(entry.sid) or NetworkGrant(resolver.resolve_sid(entry.sid))
        if entry.allow:
            grant.allow_mask |= entry.mask
        else:
            grant.deny_mask |= entry.mask
        grant.inherited = grant.inherited and entry.inherited
        grants[entry.sid] = grant
    return grants


def _match(
    stored: StoredGroup, grants: dict[str, NetworkGrant], resolver: DirectoryResolver
) -> tuple[NetworkGrant | None, DirectoryPrincipal | None]:
    keys = {stored.identifier.casefold(), stored.name.casefold()}
    for grant in grants.values():
        if not grant.matched and keys & grant.principal.aliases():
            return grant, grant.principal
    principal = resolver.resolve_name(stored.identifier) or (
        resolver.resolve_name(stored.name) if stored.name != stored.identifier else None
    )
    if (
        principal
        and principal.sid
        and principal.sid in grants
        and not grants[principal.sid].matched
    ):
        return grants[principal.sid], grants[principal.sid].principal
    return None, principal


def _members(principal: DirectoryPrincipal | None) -> list[FolderAccessMemberOut]:
    if not principal:
        return []
    return [
        FolderAccessMemberOut(login=member.login, nome=member.name, email=member.email)
        for member in principal.members
    ]


def _entry(
    *,
    principal: DirectoryPrincipal | None,
    stored: StoredGroup | None,
    grant: NetworkGrant | None,
    situacao: str,
) -> FolderAccessEntryOut:
    kind = (
        "role"
        if stored and stored.principal_type == "role"
        else (principal.kind if principal else "unknown")
    )
    return FolderAccessEntryOut(
        grupo=(principal.display_name or principal.name if principal and grant else None)
        or (stored.name if stored else "")
        or ((principal.display_name or principal.name) if principal else ""),
        identificador=stored.identifier if stored else None,
        sid=principal.sid if principal else None,
        tipo=kind,
        nivelSigac=stored.access_level if stored else None,
        nivelRede=access_level(grant.allow_mask) if grant and grant.allow_mask else None,
        direitosRede=rights_label(grant.allow_mask) if grant and grant.allow_mask else None,
        negado=bool(grant and grant.deny_mask),
        herdado=bool(grant and grant.inherited),
        situacao=situacao,
        acessoAmplo=bool(principal and principal.broad and grant and grant.allow_mask),
        fonteDiretorio=principal.source if principal else "none",
        membros=_members(principal),
        membrosFonte=principal.members_source if principal else None,
        membrosTruncados=bool(principal and principal.members_truncated),
    )


def _alerts(entries: list[FolderAccessEntryOut]) -> list[str]:
    alerts: list[str] = []
    for entry in entries:
        if entry.acessoAmplo:
            alerts.append(f"Acesso amplo: '{entry.grupo}' tem {entry.direitosRede} na pasta.")
        if entry.negado:
            alerts.append(f"'{entry.grupo}' possui uma regra de negação explícita na pasta.")
        if entry.tipo == "user" and entry.nivelRede:
            alerts.append(
                f"O usuário '{entry.grupo}' tem permissão direta na pasta, fora de grupo."
            )
        if entry.tipo == "group" and entry.membrosFonte and not entry.membros:
            alerts.append(f"O grupo '{entry.grupo}' não tem membros.")
    counters = {
        "nivel_divergente": "{n} grupo(s) com nível diferente entre o SIGAC e a pasta.",
        "somente_rede": "{n} permissão(ões) na pasta sem cadastro no SIGAC.",
        "somente_sigac": "{n} grupo(s) cadastrado(s) no SIGAC sem permissão na pasta.",
    }
    for status, message in counters.items():
        total = sum(
            1
            for entry in entries
            if entry.situacao == status and entry.tipo not in {"wellknown", "unix"}
        )
        if total:
            alerts.append(message.format(n=total))
    unresolved = sum(1 for entry in entries if entry.tipo == "unknown" and entry.sid)
    if unresolved:
        alerts.append(
            f"{unresolved} identidade(s) da ACL não foram encontradas no diretório (SID sem nome)."
        )
    if any(entry.tipo == "unix" for entry in entries):
        alerts.append(
            "A pasta usa permissões UNIX do storage; os grupos reais precisam ser consultados pela equipe de storage."
        )
    return alerts


def build_folder_access(
    *,
    project_id: str,
    project_name: str,
    folder: str,
    stored_groups: list[StoredGroup],
    resolver: DirectoryResolver,
    read_acl,
    warnings: list[str] | None = None,
) -> FolderAccessOut:
    acl: FolderAcl | None = None
    acl_status, acl_message = "ok", None
    if not folder.strip():
        acl_status, acl_message = "sem_pasta", "O projeto não tem pasta raiz cadastrada."
    else:
        try:
            acl = read_acl(folder)
        except FolderAclUnavailable as error:
            acl_status, acl_message = "indisponivel", str(error)
            logger.warning(
                "folder_access_acl_unavailable project_id=%s folder=%s reason=%s",
                project_id,
                folder,
                acl_message,
            )
        except OSError:
            logger.exception(
                "folder_access_acl_read_failed project_id=%s folder=%s",
                project_id,
                folder,
            )
            acl_status, acl_message = "indisponivel", "Não foi possível ler a ACL da pasta."

    grants = _grants(acl, resolver) if acl else {}
    entries: list[FolderAccessEntryOut] = []
    for stored in stored_groups:
        if stored.principal_type == "role":
            entries.append(
                _entry(principal=None, stored=stored, grant=None, situacao="papel_aplicacao")
            )
            continue
        grant, principal = _match(stored, grants, resolver)
        if grant:
            grant.matched = True
            situacao = (
                "conforme"
                if access_level(grant.allow_mask) == stored.access_level
                else "nivel_divergente"
            )
        else:
            situacao = "somente_sigac" if acl else "nao_verificado"
        if principal:
            resolver.load_members(principal)
        entries.append(_entry(principal=principal, stored=stored, grant=grant, situacao=situacao))

    for grant in grants.values():
        if grant.matched:
            continue
        resolver.load_members(grant.principal)
        entries.append(
            _entry(principal=grant.principal, stored=None, grant=grant, situacao="somente_rede")
        )

    entries.sort(key=lambda entry: (STATUS_ORDER[entry.situacao], entry.grupo.casefold()))
    return FolderAccessOut(
        projectId=project_id,
        projectName=project_name,
        pasta=folder,
        aclStatus=acl_status,
        aclMensagem=acl_message,
        herancaBloqueada=acl.inheritance_blocked if acl else None,
        proprietario=resolver.resolve_sid(acl.owner_sid).name if acl and acl.owner_sid else None,
        entries=entries,
        alertas=_alerts(entries),
        avisos=warnings or [],
        consultadoEm=datetime.now(UTC),
    )


@dataclass
class AclSyncResult:
    """Resultado da sincronização da ACL da pasta com o banco."""

    inserted: list[dict]
    existing: list[dict]
    errors: list[str]


def _acl_level(mask: int, deny_mask: int) -> str:
    """Nível normalizado a partir das máscaras de acesso da ACL."""
    if deny_mask & 0x001F01FF:
        # Se há deny explícito, o nível efetivo pode ser menor, mas usamos a allow como referência
        pass
    return access_level(mask)


def sync_folder_acl(
    folder: str,
    project_id: str,
    resolver: DirectoryResolver,
) -> AclSyncResult:
    """Lê a ACL real da pasta e retorna os grupos para upsert no project_access_groups.

    Tenta a pasta raiz primeiro. Se não encontrar grupos de domínio com ACEs explícitas
    (não herdadas), percorre as subpastas imediatas e coleta as ACEs explícitas delas.
    Considera ACEs allow (ignora deny), de grupos de domínio.
    Grupos UNIX, well-known e usuários são ignorados.
    """
    result = AclSyncResult(inserted=[], existing=[], errors=[])
    logger.info(
        "folder_acl_groups_discovery_started project_id=%s folder_configured=%s",
        project_id,
        bool(folder.strip()),
    )

    if not folder.strip():
        result.errors.append("Projeto sem pasta raiz cadastrada.")
        return result

    def _collect_from_acl(
        acl: FolderAcl, require_explicit: bool, scope: str
    ) -> list[dict]:
        items: list[dict] = []
        grants = _grants(acl, resolver)
        logger.info(
            "folder_acl_entries_read project_id=%s scope=%s entries=%d principals=%d",
            project_id,
            scope,
            len(acl.entries),
            len(grants),
        )
        seen: set[str] = set()
        for grant in grants.values():
            principal = grant.principal
            if principal.kind in {"wellknown", "unix", "user"}:
                continue
            if not grant.allow_mask:
                continue
            if require_explicit and grant.inherited:
                continue
            key = principal.sid or principal.name
            if key in seen:
                continue
            seen.add(key)
            level = _acl_level(grant.allow_mask, grant.deny_mask)
            identifier = principal.sid or principal.name
            group_id = str(uuid4())
            group_name = principal.display_name or principal.name or identifier
            logger.info(
                "folder_acl_group_discovered project_id=%s scope=%s sid=%s principal_name=%r principal_source=%s access_level=%s inherited=%s deny_present=%s",
                project_id,
                scope,
                principal.sid or "-",
                principal.display_name or principal.name or "-",
                principal.source,
                level,
                grant.inherited,
                bool(grant.deny_mask),
            )
            items.append(
                {
                    "group_id": group_id,
                    "group_name": group_name,
                    "identifier": identifier,
                    "principal_type": "group",
                    "access_level": level,
                    "source": "rede",
                    "project_id": project_id,
                }
            )
        return items

    logger.info("folder_acl_root_read_started project_id=%s", project_id)
    try:
        root_acl = read_folder_acl(folder)
    except FolderAclUnavailable as error:
        result.errors.append(str(error))
        return result
    except OSError as error:
        result.errors.append(f"Não foi possível ler a ACL: {error}")
        return result

    # Inclui os grupos herdados da raiz e as permissões explícitas de todas as
    # subpastas imediatas; uma ACL encontrada na raiz não deve ocultar as demais.
    logger.info(
        "folder_acl_root_read_completed project_id=%s entries=%d",
        project_id,
        len(root_acl.entries),
    )
    result.inserted = _collect_from_acl(root_acl, require_explicit=False, scope="raiz")
    known_identifiers = {item["identifier"] for item in result.inserted}

    import os

    local_folder = resolve_network_path(folder)
    try:
        with os.scandir(local_folder) as entries:
            subdirs = [
                entry.path
                for entry in entries
                if entry.is_dir(follow_symlinks=False)
            ]
    except OSError as error:
        result.errors.append(f"Não foi possível listar subpastas de {folder}: {error}")
        logger.warning(
            "folder_acl_subfolders_list_failed project_id=%s error_type=%s",
            project_id,
            type(error).__name__,
        )
        return result

    logger.info(
        "folder_acl_subfolders_listed project_id=%s subfolders=%d",
        project_id,
        len(subdirs),
    )
    for subdir in subdirs:
        try:
            sub_acl = read_folder_acl(subdir)
        except (FolderAclUnavailable, OSError) as error:
            result.errors.append(f"Não foi possível ler a ACL de {subdir}: {error}")
            logger.warning(
                "folder_acl_subfolder_read_failed project_id=%s error_type=%s",
                project_id,
                type(error).__name__,
            )
            continue
        logger.info(
            "folder_acl_subfolder_read_completed project_id=%s entries=%d",
            project_id,
            len(sub_acl.entries),
        )
        for item in _collect_from_acl(sub_acl, require_explicit=True, scope="subpasta"):
            if item["identifier"] not in known_identifiers:
                result.inserted.append(item)
                known_identifiers.add(item["identifier"])

    logger.info(
        "folder_acl_groups_discovery_completed project_id=%s groups=%d errors=%d",
        project_id,
        len(result.inserted),
        len(result.errors),
    )
    return result
