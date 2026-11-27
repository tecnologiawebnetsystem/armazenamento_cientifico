import struct
from types import SimpleNamespace

import pytest

from app.infrastructure.directory import (
    DirectoryMember,
    DirectoryPrincipal,
    DirectoryResolver,
    LdapDirectory,
)
from app.infrastructure.folder_acl import (
    FULL_CONTROL,
    MODIFY,
    READ_AND_EXECUTE,
    AclEntry,
    FolderAcl,
    FolderAclUnavailable,
    parse_security_descriptor,
    resolve_network_path,
    sid_to_bytes,
)
from app.modules.projects.folder_access import (
    StoredGroup,
    build_folder_access,
    sync_folder_acl,
)

WRITERS = "S-1-5-21-1-2-3-1001"
READERS = "S-1-5-21-1-2-3-1002"
ORPHAN = "S-1-5-21-1-2-3-9999"
DIRECT_USER = "S-1-5-21-1-2-3-2001"


def _ace(ace_type: int, flags: int, mask: int, sid: str) -> bytes:
    sid_bytes = sid_to_bytes(sid)
    return struct.pack("<BBHI", ace_type, flags, 8 + len(sid_bytes), mask) + sid_bytes


def test_parse_security_descriptor_reads_owner_dacl_and_skips_inherit_only_aces():
    owner = sid_to_bytes("S-1-5-32-544")
    aces = [
        _ace(0x00, 0x00, MODIFY, WRITERS),
        _ace(0x01, 0x10, FULL_CONTROL, READERS),
        _ace(0x00, 0x08, FULL_CONTROL, "S-1-3-0"),
    ]
    dacl = struct.pack("<BBHHH", 2, 0, 8 + sum(map(len, aces)), len(aces), 0) + b"".join(aces)
    header_size = 20
    descriptor = struct.pack(
        "<BBHIIII", 1, 0, 0x8000 | 0x1000, header_size, 0, 0, header_size + len(owner)
    )
    acl = parse_security_descriptor(descriptor + owner + dacl)

    assert acl.owner_sid == "S-1-5-32-544"
    assert acl.inheritance_blocked is True
    assert acl.entries == [
        AclEntry(sid=WRITERS, mask=MODIFY, allow=True, inherited=False),
        AclEntry(sid=READERS, mask=FULL_CONTROL, allow=False, inherited=True),
    ]


class FakeDirectory:
    name = "ldap"

    def __init__(self):
        self.groups = {
            WRITERS: DirectoryPrincipal(
                sid=WRITERS, name="GL_PROJ_W", kind="group", source="ldap", dn="CN=W"
            ),
            READERS: DirectoryPrincipal(
                sid=READERS, name="GL_PROJ_R", kind="group", source="ldap", dn="CN=R"
            ),
            DIRECT_USER: DirectoryPrincipal(
                sid=DIRECT_USER, name="ABC1", kind="user", source="ldap"
            ),
        }
        self.members = {"CN=W": [DirectoryMember("FEZ6", "Fulano", "f@x")], "CN=R": []}

    def by_sid(self, sid):
        principal = self.groups.get(sid)
        return DirectoryPrincipal(**{**principal.__dict__, "members": []}) if principal else None

    def by_name(self, identifier):
        if identifier == "sigac-readers-alias":
            return self.by_sid(READERS)
        return None

    def load_members(self, principal, limit):
        if principal.dn not in self.members:
            return False
        principal.members = self.members[principal.dn][:limit]
        principal.members_source = self.name
        return True

    def close(self):
        pass


def test_build_folder_access_compares_sigac_with_folder_acl_and_flags_risks():
    acl = FolderAcl(
        path="//srv/proj",
        owner_sid="S-1-5-32-544",
        inheritance_blocked=True,
        entries=[
            AclEntry(WRITERS, MODIFY, True, False),
            AclEntry(READERS, READ_AND_EXECUTE, True, False),
            AclEntry("S-1-5-11", READ_AND_EXECUTE, True, False),
            AclEntry(DIRECT_USER, FULL_CONTROL, True, False),
            AclEntry(ORPHAN, MODIFY, True, False),
        ],
    )
    result = build_folder_access(
        project_id="p1",
        project_name="Projeto",
        folder="//srv/proj",
        stored_groups=[
            StoredGroup("Escritores", "GL_PROJ_W", "group", "leitura"),
            StoredGroup("Leitores", "sigac-readers-alias", "group", "leitura"),
            StoredGroup("Grupo antigo", "GL_ANTIGO", "group", "escrita"),
            StoredGroup("editor", "editor", "role", "escrita"),
        ],
        resolver=DirectoryResolver([FakeDirectory()], member_limit=10),
        read_acl=lambda _path: acl,
    )

    by_name = {entry.grupo: entry for entry in result.entries}
    assert result.aclStatus == "ok"
    assert result.proprietario == "BUILTIN\\Administradores"
    assert by_name["GL_PROJ_W"].situacao == "nivel_divergente"
    assert (by_name["GL_PROJ_W"].nivelSigac, by_name["GL_PROJ_W"].nivelRede) == (
        "leitura",
        "escrita",
    )
    assert [member.login for member in by_name["GL_PROJ_W"].membros] == ["FEZ6"]
    assert by_name["GL_PROJ_R"].situacao == "conforme"
    assert by_name["GL_PROJ_R"].identificador == "sigac-readers-alias"
    assert by_name["Grupo antigo"].situacao == "somente_sigac"
    assert by_name["editor"].situacao == "papel_aplicacao"
    assert by_name["Usuários autenticados"].acessoAmplo is True
    assert by_name["ABC1"].situacao == "somente_rede"
    assert by_name[ORPHAN].tipo == "unknown"
    assert result.entries[0].situacao == "nivel_divergente"
    assert any("Acesso amplo" in alert for alert in result.alertas)
    assert any("'ABC1' tem permissão direta" in alert for alert in result.alertas)
    assert any("'GL_PROJ_R' não tem membros" in alert for alert in result.alertas)
    assert any("1 identidade(s)" in alert for alert in result.alertas)


def test_build_folder_access_prefers_directory_display_name_for_cards():
    named_principal = DirectoryPrincipal(
        sid=WRITERS,
        name="GL_PROJ_W",
        display_name="Grupo de Escrita do Projeto",
        kind="group",
        source="ldap",
    )

    class NamedDirectory(FakeDirectory):
        def by_sid(self, sid):
            return named_principal if sid == WRITERS else None

    result = build_folder_access(
        project_id="p1",
        project_name="Projeto",
        folder="//srv/proj",
        stored_groups=[StoredGroup("Nome antigo", "GL_PROJ_W", "group", "escrita")],
        resolver=DirectoryResolver([NamedDirectory()], member_limit=10),
        read_acl=lambda _path: FolderAcl(
            path="//srv/proj",
            owner_sid=None,
            inheritance_blocked=False,
            entries=[AclEntry(WRITERS, MODIFY, True, False)],
        ),
    )

    assert result.entries[0].grupo == "Grupo de Escrita do Projeto"


def test_build_folder_access_keeps_sigac_groups_when_acl_is_unavailable():
    def unavailable(_path):
        raise FolderAclUnavailable("Sem acesso à ACL")

    result = build_folder_access(
        project_id="p1",
        project_name="Projeto",
        folder="//srv/proj",
        stored_groups=[StoredGroup("Leitores", "sigac-readers-alias", "group", "leitura")],
        resolver=DirectoryResolver([FakeDirectory()], member_limit=10),
        read_acl=unavailable,
    )

    assert result.aclStatus == "indisponivel"
    assert result.aclMensagem == "Sem acesso à ACL"
    assert [(entry.grupo, entry.situacao) for entry in result.entries] == [
        ("Leitores", "nao_verificado")
    ]


def test_graph_members_resolve_ldap_group_by_sid_when_entra_id_is_missing(monkeypatch):
    from app.infrastructure.directory import GraphDirectory

    directory = GraphDirectory.__new__(GraphDirectory)
    directory.base_url = "https://graph.microsoft.com/v1.0"
    directory.headers = {}
    directory.client = SimpleNamespace(
        get=lambda *_args, **_kwargs: SimpleNamespace(
            raise_for_status=lambda: None,
            json=lambda: {
                "value": [
                    {
                        "displayName": "Fulano",
                        "onPremisesSamAccountName": "FEZ6",
                        "mail": "f@x",
                    }
                ]
            },
        )
    )
    monkeypatch.setattr(
        directory,
        "by_sid",
        lambda sid: DirectoryPrincipal(
            sid=sid,
            name="GL_PROJ_W",
            kind="group",
            source="graph",
            entra_id="entra-group-id",
        ),
    )
    principal = DirectoryPrincipal(
        sid=WRITERS, name="GL_PROJ_W", kind="group", source="ldap", dn="CN=W"
    )

    assert directory.load_members(principal, limit=10) is True
    assert principal.entra_id == "entra-group-id"
    assert [(member.login, member.email) for member in principal.members] == [
        ("FEZ6", "f@x")
    ]
    assert principal.members_source == "graph"


def test_ldap_members_use_direct_then_nested_and_respect_limit():
    calls = []

    def paged_search(base, search_filter, **_kwargs):
        calls.append(search_filter)
        # Primeira chamada: membros diretos (vazia, para forcar nested)
        if "memberOf:1.2.840.113556.1.4.1941:" not in search_filter:
            return
        for login in ("AAA1", "BBB2", "CCC3"):
            yield {
                "type": "searchResEntry",
                "attributes": {"sAMAccountName": login, "displayName": login, "mail": []},
            }

    directory = LdapDirectory.__new__(LdapDirectory)
    directory.base_dn = "DC=x"
    directory.connection = SimpleNamespace(
        extend=SimpleNamespace(standard=SimpleNamespace(paged_search=paged_search))
    )
    principal = DirectoryPrincipal(
        sid=WRITERS, name="GL_PROJ_W", kind="group", source="ldap", dn="CN=GL_PROJ_W,DC=x"
    )

    assert directory.load_members(principal, limit=2) is True
    assert "memberOf:1.2.840.113556.1.4.1941:=CN=GL_PROJ_W,DC=x" in calls[1]
    assert [member.login for member in principal.members] == ["AAA1", "BBB2"]
    assert principal.members_truncated is True


@pytest.mark.parametrize(
    ("sid", "kind", "broad"),
    [
        ("S-1-5-11", "wellknown", True),
        ("S-1-5-21-1-2-3-513", "wellknown", True),
        ("S-1-6-5001-0", "unix", False),
    ],
)
def test_resolver_identifies_well_known_and_unix_sids_without_directory(sid, kind, broad):
    principal = DirectoryResolver([], member_limit=10).resolve_sid(sid)

    assert (principal.kind, principal.broad) == (kind, broad)


def test_sync_folder_acl_collects_root_and_every_immediate_subfolder(tmp_path, monkeypatch):
    from app.modules.projects import folder_access

    subfolders = [tmp_path / f"subfolder-{index}" for index in range(7)]
    for subfolder in subfolders:
        subfolder.mkdir()

    identifiers = [f"S-1-5-21-1-2-3-{index}" for index in range(1001, 1009)]
    acls = {
        str(tmp_path): FolderAcl(
            path=str(tmp_path),
            owner_sid=None,
            inheritance_blocked=False,
            entries=[AclEntry(identifiers[0], MODIFY, True, False)],
        )
    }
    for subfolder, identifier in zip(subfolders, identifiers[1:]):
        acls[str(subfolder)] = FolderAcl(
            path=str(subfolder),
            owner_sid=None,
            inheritance_blocked=False,
            entries=[AclEntry(identifier, MODIFY, True, False)],
        )

    monkeypatch.setattr(folder_access, "read_folder_acl", lambda path: acls[str(path)])

    class Resolver:
        def resolve_sid(self, sid):
            return DirectoryPrincipal(
                sid=sid, name=f"GROUP-{sid.rsplit('-', 1)[-1]}", kind="group", source="ldap"
            )

    result = sync_folder_acl(str(tmp_path), "project-1", Resolver())

    assert len(result.inserted) == 8
    assert {item["identifier"] for item in result.inserted} == set(identifiers)
    assert result.errors == []


def test_resolve_network_path_maps_unc_relative_to_cifs_mount(tmp_path):
    assert resolve_network_path(
        r"\\dfs.petrobras.biz\cientifico\cenpes\labs\lfr",
        mount_root=str(tmp_path),
        unc_prefix=r"\\dfs.petrobras.biz\cientifico",
    ) == str(tmp_path / "cenpes" / "labs" / "lfr")


def test_resolve_network_path_does_not_match_a_different_unc_share(tmp_path):
    path = r"\\dfs.petrobras.biz\outro-share\cenpes"

    assert resolve_network_path(
        path,
        mount_root=str(tmp_path),
        unc_prefix=r"\\dfs.petrobras.biz\cientifico",
    ) == path
