"""Leitura da ACL (DACL) de uma pasta de rede.

O descritor de segurança é obtido em formato binário self-relative:
- Windows: ``GetFileSecurityW`` no caminho UNC;
- Linux com compartilhamento montado via CIFS: xattr ``system.cifs_acl``.
"""

from __future__ import annotations

import os
import struct
import sys
from dataclasses import dataclass, field

ACCESS_ALLOWED = 0x00
ACCESS_DENIED = 0x01
INHERIT_ONLY_ACE = 0x08
INHERITED_ACE = 0x10
SE_DACL_PROTECTED = 0x1000

GENERIC_ALL = 0x10000000
GENERIC_EXECUTE = 0x20000000
GENERIC_WRITE = 0x40000000
GENERIC_READ = 0x80000000
FULL_CONTROL = 0x001F01FF
MODIFY = 0x001301BF
READ_AND_EXECUTE = 0x001200A9
READ = 0x00120089
WRITE = 0x00100116
WRITE_MASK = 0x2 | 0x4 | 0x10000 | GENERIC_WRITE
READ_MASK = 0x1 | GENERIC_READ

KNOWN_RIGHTS = (
    (FULL_CONTROL, "Controle total"),
    (MODIFY, "Modificar"),
    (READ_AND_EXECUTE | WRITE, "Leitura e gravação"),
    (READ_AND_EXECUTE, "Leitura e execução"),
    (READ, "Leitura"),
    (WRITE, "Gravação"),
)


class FolderAclUnavailable(Exception):
    """A ACL não pôde ser lida (caminho inexistente, sem permissão ou plataforma sem suporte)."""


@dataclass(frozen=True)
class AclEntry:
    sid: str
    mask: int
    allow: bool
    inherited: bool


@dataclass
class FolderAcl:
    path: str
    owner_sid: str | None
    inheritance_blocked: bool
    entries: list[AclEntry] = field(default_factory=list)


def parse_sid(data: bytes, offset: int = 0) -> tuple[str, int]:
    revision, count = data[offset], data[offset + 1]
    authority = int.from_bytes(data[offset + 2 : offset + 8], "big")
    sub_authorities = struct.unpack_from(f"<{count}I", data, offset + 8)
    sid = "-".join(["S", str(revision), str(authority), *map(str, sub_authorities)])
    return sid, 8 + 4 * count


def sid_to_bytes(sid: str) -> bytes:
    parts = sid.split("-")
    if len(parts) < 3 or parts[0].upper() != "S":
        raise ValueError(f"SID inválido: {sid}")
    sub_authorities = [int(value) for value in parts[3:]]
    return (
        bytes([int(parts[1]), len(sub_authorities)])
        + int(parts[2]).to_bytes(6, "big")
        + struct.pack(f"<{len(sub_authorities)}I", *sub_authorities)
    )


def parse_security_descriptor(data: bytes, path: str = "") -> FolderAcl:
    if len(data) < 20:
        raise FolderAclUnavailable("Descritor de segurança vazio ou truncado")
    _revision, _sbz1, control, owner_offset, _group, _sacl, dacl_offset = struct.unpack_from(
        "<BBHIIII", data, 0
    )
    owner = parse_sid(data, owner_offset)[0] if owner_offset else None
    acl = FolderAcl(path=path, owner_sid=owner, inheritance_blocked=bool(control & SE_DACL_PROTECTED))
    if not dacl_offset:
        return acl
    _acl_revision, _sbz, _size, ace_count, _sbz2 = struct.unpack_from("<BBHHH", data, dacl_offset)
    cursor = dacl_offset + 8
    for _ in range(ace_count):
        ace_type, flags, ace_size = struct.unpack_from("<BBH", data, cursor)
        # Somente ACEs simples de permitir/negar; ACEs de objeto/callback não se aplicam a pastas.
        if ace_type in (ACCESS_ALLOWED, ACCESS_DENIED) and not flags & INHERIT_ONLY_ACE:
            mask = struct.unpack_from("<I", data, cursor + 4)[0]
            sid = parse_sid(data, cursor + 8)[0]
            acl.entries.append(
                AclEntry(sid=sid, mask=mask, allow=ace_type == ACCESS_ALLOWED, inherited=bool(flags & INHERITED_ACE))
            )
        cursor += ace_size
    return acl


def access_level(mask: int) -> str:
    if mask & GENERIC_ALL or mask & FULL_CONTROL == FULL_CONTROL:
        return "administrador"
    if mask & WRITE_MASK:
        return "escrita"
    if mask & (READ_MASK | GENERIC_EXECUTE):
        return "leitura"
    return "especial"


def rights_label(mask: int) -> str:
    if mask & GENERIC_ALL:
        return "Controle total"
    normalized = mask & 0x001F01FF
    for known, label in KNOWN_RIGHTS:
        if normalized == known:
            return label
    return f"Especial (0x{mask:08X})"


def _read_windows(path: str) -> bytes:
    import ctypes
    from ctypes import wintypes

    advapi32 = ctypes.WinDLL("advapi32", use_last_error=True)
    get_file_security = advapi32.GetFileSecurityW
    get_file_security.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(wintypes.DWORD)]
    get_file_security.restype = wintypes.BOOL
    information = 0x1 | 0x4  # OWNER + DACL
    needed = wintypes.DWORD(0)
    get_file_security(path, information, None, 0, ctypes.byref(needed))
    if not needed.value:
        raise FolderAclUnavailable(f"Sem acesso à ACL (erro Windows {ctypes.get_last_error()})")
    buffer = ctypes.create_string_buffer(needed.value)
    if not get_file_security(path, information, buffer, needed.value, ctypes.byref(needed)):
        raise FolderAclUnavailable(f"Sem acesso à ACL (erro Windows {ctypes.get_last_error()})")
    return buffer.raw


def _read_cifs_xattr(path: str) -> bytes:
    try:
        return os.getxattr(path, "system.cifs_acl")
    except (AttributeError, OSError) as error:
        raise FolderAclUnavailable(
            "ACL indisponível: o caminho precisa estar montado via CIFS com suporte a system.cifs_acl"
        ) from error


def read_folder_acl(path: str) -> FolderAcl:
    if not path or not os.path.isdir(path):
        raise FolderAclUnavailable("Pasta raiz inexistente ou inacessível pelo servidor")
    data = _read_windows(path) if sys.platform == "win32" else _read_cifs_xattr(path)
    return parse_security_descriptor(data, path)
